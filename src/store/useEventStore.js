import { create } from 'zustand'
import { toast } from './useToastStore'
import { getWorkWeekStart, addWeek, subWeek, fmtDate, timeToMinutes } from '../lib/dateUtils'
import { sanitizeString } from '../lib/validation'
import { isAuthRequired } from '../lib/envConfig'

function sanitizeEvent(ev) {
  return {
    ...ev,
    title: typeof ev.title === 'string' ? sanitizeString(ev.title) : ev.title,
    sub: typeof ev.sub === 'string' ? sanitizeString(ev.sub) : ev.sub,
  }
}

const genId = () => 'e' + Date.now() + Math.random().toString(36).slice(2, 6)
const logId = () => 'l' + Date.now() + Math.random().toString(36).slice(2, 6)

const today = new Date()
const wd = (offset) => {
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + offset)
  return fmtDate(monday)
}

// No seed events - all data comes from Supabase

export const getTaskStatus = (ev) => {
  if (ev.cancelled) return 'cancelled'
  if (ev.done) return 'done'
  const evDateTime = new Date(`${ev.date}T${ev.time}`)
  if (evDateTime < new Date()) return 'overdue'
  return 'upcoming'
}

export const STATUS_STYLES = {
  done:      { label: 'Done',      pill: 'bg-green-900/40 text-green-400 border-green-700/40' },
  upcoming:  { label: 'Upcoming',  pill: 'bg-blue-900/40 text-blue-400 border-blue-700/40' },
  overdue:   { label: 'Overdue',   pill: 'bg-red-900/40 text-red-400 border-red-700/40' },
  cancelled: { label: 'Cancelled', pill: 'bg-gray-800/60 text-gray-500 border-gray-700/40' },
}

export const useEventStore = create((set, get) => ({
      events: [],
      taskLog: [],
      currentWeekStart: getWorkWeekStart(today),
      searchQuery: '',
      awakeStart: 6,
      awakeEnd: 24,
      isLoading: false,
      error: null,
      isOnline: true,
      pendingSync: [],
      realtimeSubscription: null,
      supabase: null,
      userId: null,

      setSearchQuery: (q) => set({ searchQuery: q }),
      setAwakeStart: (h) => set({ awakeStart: h }),
      setAwakeEnd: (h) => set({ awakeEnd: h }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      setOnline: (isOnline) => set({ isOnline }),

      nextWeek: () => set((s) => ({ currentWeekStart: addWeek(s.currentWeekStart) })),
      prevWeek: () => set((s) => ({ currentWeekStart: subWeek(s.currentWeekStart) })),
      jumpToDate: (date) => set({ currentWeekStart: getWorkWeekStart(date) }),

      initializeSupabase: async (supabase, userId) => {
        if (!supabase || !userId) return

        set({ isLoading: true, error: null, supabase, userId })
        
        try {
          const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: true })
            .order('time', { ascending: true })

          if (error) throw error

          if (data && data.length > 0) {
            set({ events: data, isLoading: false })
          } else {
            set({ isLoading: false })
          }
          
          console.log(`[Events] Loaded ${data?.length || 0} events from Supabase`)
        } catch (error) {
          console.error('Failed to load events from Supabase:', error)
          set({ error: error.message, isLoading: false })
        }
      },

      subscribeToEvents: (supabase, userId) => {
        if (!supabase || !isAuthRequired() || !userId) return

        const subscription = supabase
          .channel('events_changes')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'events',
            filter: `user_id=eq.${userId}`
          }, (payload) => {
            console.log('[Events] Real-time update received:', payload.eventType, payload.new?.id || payload.old?.id)
            const { eventType, new: newRecord, old: oldRecord } = payload
            
            switch (eventType) {
              case 'INSERT':
                set((s) => ({
                  events: [...s.events.filter(e => e.id !== newRecord.id), newRecord]
                    .sort((a, b) => {
                      if (a.date !== b.date) return a.date.localeCompare(b.date)
                      return a.time.localeCompare(b.time)
                    })
                }))
                break
                
              case 'UPDATE':
                set((s) => ({
                  events: s.events.map(e => e.id === newRecord.id ? newRecord : e)
                }))
                break
                
              case 'DELETE':
                set((s) => ({
                  events: s.events.filter(e => e.id !== oldRecord.id)
                }))
                break
            }
          })
          .subscribe((status) => {
            console.log('[Events] Subscription status:', status)
            if (status === 'SUBSCRIBED') {
              console.log('✅ Real-time events subscription active')
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Events subscription failed')
            }
          })

        set({ realtimeSubscription: subscription })
      },

      unsubscribeFromEvents: () => {
        const { realtimeSubscription } = get()
        if (realtimeSubscription) {
          realtimeSubscription.unsubscribe()
          set({ realtimeSubscription: null })
        }
      },

      addEvent: async (ev) => {
        const { supabase, userId } = get()
        const sanitizedEv = sanitizeEvent(ev)
        
        // Create temporary ID for optimistic UI update
        const tempId = 'temp_' + Date.now() + Math.random().toString(36).slice(2, 9)
        
        const newEv = { 
          id: tempId,
          done: false, 
          cancelled: false, 
          recurrence: 'none', 
          recurrenceEnd: '', 
          ...sanitizedEv 
        }
        
        const log = {
          id: logId(), 
          eventId: tempId, 
          title: newEv.title,
          status: getTaskStatus(newEv), 
          timestamp: new Date().toISOString(),
        }

        // Optimistically add to UI immediately
        set((s) => ({
          events: [...s.events, newEv].sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date)
            return a.time.localeCompare(b.time)
          }),
          taskLog: [...s.taskLog, log],
          isLoading: false
        }))

        if (supabase && userId) {
          const eventToInsert = {
            // Don't include 'id' - let Supabase generate UUID
            title: newEv.title,
            sub: newEv.sub || '',
            date: newEv.date,
            time: newEv.time,
            duration: newEv.duration,
            color: newEv.color,
            done: newEv.done,
            cancelled: newEv.cancelled,
            recurrence: newEv.recurrence,
            recurrence_end: newEv.recurrenceEnd || null,
            user_id: userId
          }

          if (get().isOnline) {
            try {
              const { data, error } = await supabase
                .from('events')
                .insert([eventToInsert])
                .select()
                .single()

              if (error) throw error

              // Replace temporary ID with database-generated UUID
              console.log('[Events] Event saved to Supabase with UUID:', data.id)
              set((s) => ({
                events: s.events.map(e => 
                  e.id === tempId ? { ...e, id: data.id } : e
                ),
                taskLog: s.taskLog.map(l =>
                  l.eventId === tempId ? { ...l, eventId: data.id } : l
                )
              }))
            } catch (error) {
              console.error('Failed to sync event to Supabase:', error)
              set((s) => ({
                pendingSync: [...s.pendingSync, { type: 'INSERT', data: eventToInsert, tempId }]
              }))
              toast.error('Event saved locally - will sync when online', 'Offline')
            }
          } else {
            set((s) => ({
              pendingSync: [...s.pendingSync, { type: 'INSERT', data: eventToInsert, tempId }]
            }))
            toast.info('Event saved locally - will sync when online', 'Offline Mode')
          }
        }
      },

      editEvent: (id, changes, editAll = false) => {
        const { supabase, userId } = get()
        const sanitizedChanges = sanitizeEvent(changes)
        
        set((s) => ({
          events: s.events.map((e) => {
            if (e.id === id) {
              return { ...e, ...sanitizedChanges }
            }
            return e
          }),
          isLoading: false
        }))

        if (supabase && userId) {
          const updateData = {
            title: sanitizedChanges.title,
            sub: sanitizedChanges.sub || '',
            date: sanitizedChanges.date,
            time: sanitizedChanges.time,
            duration: sanitizedChanges.duration,
            color: sanitizedChanges.color,
            done: sanitizedChanges.done,
            cancelled: sanitizedChanges.cancelled,
            recurrence: sanitizedChanges.recurrence,
            recurrence_end: sanitizedChanges.recurrenceEnd || null,
          }

          if (get().isOnline) {
            supabase
              .from('events')
              .update(updateData)
              .eq('id', id)
              .eq('user_id', userId)
              .then(({ error }) => {
                if (error) {
                  console.error('Failed to sync event update:', error)
                  set((s) => ({
                    pendingSync: [...s.pendingSync, { type: 'UPDATE', id, data: updateData, userId }]
                  }))
                }
              })
          } else {
            set((s) => ({
              pendingSync: [...s.pendingSync, { type: 'UPDATE', id, data: updateData, userId }]
            }))
          }
        }
      },

      deleteEvent: (id) => {
        const { supabase, userId } = get()
        set((s) => ({
          events: s.events.filter((e) => e.id !== id),
          taskLog: s.taskLog.filter((l) => l.eventId !== id),
          isLoading: false
        }))

        if (supabase && userId) {
          if (get().isOnline) {
            supabase
              .from('events')
              .delete()
              .eq('id', id)
              .eq('user_id', userId)
              .then(({ error }) => {
                if (error) {
                  console.error('Failed to sync event deletion:', error)
                  set((s) => ({
                    pendingSync: [...s.pendingSync, { type: 'DELETE', id, userId }]
                  }))
                  toast.error('Event deleted locally - will sync when online', 'Offline')
                }
              })
          } else {
            set((s) => ({
              pendingSync: [...s.pendingSync, { type: 'DELETE', id, userId }]
            }))
            toast.info('Event deleted locally - will sync when online', 'Offline Mode')
          }
        }
      },

      markDone: (id) => {
        const { supabase, userId } = get()
        
        set((s) => {
          const ev = s.events.find((e) => e.id === id)
          if (!ev) return {}
          
          const newDone = !ev.done
          const newStatus = newDone ? 'done' : getTaskStatus({ ...ev, done: false })
          const log = {
            id: logId(), eventId: id, title: ev.title,
            status: newStatus, timestamp: new Date().toISOString(),
          }
          
          const updatedEvent = { ...ev, done: newDone }
          
          // Sync to Supabase
          if (supabase && userId && get().isOnline) {
            supabase
              .from('events')
              .update({ done: newDone })
              .eq('id', id)
              .eq('user_id', userId)
              .then(({ error }) => {
                if (error) {
                  console.error('Failed to sync mark done:', error)
                }
              })
          }
          
          return {
            events: s.events.map((e) => e.id === id ? updatedEvent : e),
            taskLog: [...s.taskLog, log],
          }
        })
      },

      cancelEvent: (id) => {
        const { supabase, userId } = get()
        
        set((s) => {
          const ev = s.events.find((e) => e.id === id)
          if (!ev) return {}
          
          const log = {
            id: logId(), eventId: id, title: ev.title,
            status: 'cancelled', timestamp: new Date().toISOString(),
          }
          
          const updatedEvent = { ...ev, cancelled: true, done: false }
          
          // Sync to Supabase
          if (supabase && userId && get().isOnline) {
            supabase
              .from('events')
              .update({ cancelled: true, done: false })
              .eq('id', id)
              .eq('user_id', userId)
              .then(({ error }) => {
                if (error) {
                  console.error('Failed to sync cancel:', error)
                }
              })
          }
          
          return {
            events: s.events.map((e) => e.id === id ? updatedEvent : e),
            taskLog: [...s.taskLog, log],
          }
        })
      },

      reschedule: (id, newDate, newTime) => {
        const { supabase, userId } = get()
        
        set((s) => ({
          events: s.events.map((e) => e.id === id ? { ...e, date: newDate, time: newTime } : e),
        }))

        if (supabase && userId) {
          if (get().isOnline) {
            supabase
              .from('events')
              .update({ date: newDate, time: newTime })
              .eq('id', id)
              .eq('user_id', userId)
              .then(({ error }) => {
                if (error) {
                  console.error('Failed to sync reschedule:', error)
                }
              })
          } else {
            set((s) => ({
              pendingSync: [...s.pendingSync, { 
                type: 'UPDATE', 
                id, 
                data: { date: newDate, time: newTime }, 
                userId 
              }]
            }))
          }
        }
      },

      syncPendingChanges: async (supabase) => {
        const { pendingSync } = get()
        if (!pendingSync.length || !supabase) return

        set({ isLoading: true })

        for (const change of pendingSync) {
          try {
            switch (change.type) {
              case 'INSERT': {
                const { data, error } = await supabase
                  .from('events')
                  .insert([change.data])
                  .select()
                  .single()
                
                if (!error && data && change.tempId) {
                  // Replace temp ID with real UUID
                  set((s) => ({
                    events: s.events.map(e => 
                      e.id === change.tempId ? { ...e, id: data.id } : e
                    )
                  }))
                }
                break
              }
                
              case 'UPDATE':
                await supabase
                  .from('events')
                  .update(change.data)
                  .eq('id', change.id)
                  .eq('user_id', change.userId)
                break
                
              case 'DELETE':
                await supabase
                  .from('events')
                  .delete()
                  .eq('id', change.id)
                  .eq('user_id', change.userId)
                break
            }
          } catch (error) {
            console.error('Failed to sync change:', error)
          }
        }

        set({ pendingSync: [], isLoading: false })
        toast.success('All changes synced to cloud', 'Sync Complete')
      },
    })
)
