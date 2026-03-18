import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getWorkWeekStart, addWeek, subWeek, fmtDate, timeToMinutes } from '../lib/dateUtils'

const genId = () => 'e' + Date.now() + Math.random().toString(36).slice(2, 6)
const logId = () => 'l' + Date.now() + Math.random().toString(36).slice(2, 6)

const today = new Date()
const wd = (offset) => {
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + offset)
  return fmtDate(monday)
}

const SEED_EVENTS = [
  { id: genId(), title: 'Stand-up', sub: 'Zoom', date: wd(0), time: '09:00', duration: 30, color: 'green', done: false, recurrence: 'daily', recurrenceEnd: '' },
  { id: genId(), title: 'Design Review', sub: 'Figma', date: wd(1), time: '11:00', duration: 60, color: 'pink', done: false, recurrence: 'none', recurrenceEnd: '' },
  { id: genId(), title: 'Lunch', sub: 'Cafeteria', date: wd(1), time: '13:00', duration: 60, color: 'amber', done: false, recurrence: 'none', recurrenceEnd: '' },
  { id: genId(), title: 'Sprint Planning', sub: 'Room A', date: wd(2), time: '10:00', duration: 90, color: 'blue', done: false, recurrence: 'weekly', recurrenceEnd: '' },
  { id: genId(), title: 'Gym', sub: '', date: wd(3), time: '07:30', duration: 60, color: 'green', done: false, recurrence: 'weekly', recurrenceEnd: '' },
  { id: genId(), title: 'Doctor', sub: 'St. Anna', date: wd(4), time: '15:00', duration: 45, color: 'gray', done: false, recurrence: 'none', recurrenceEnd: '' },
]

// Derive task status from event data
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

export const useEventStore = create(
  persist(
    (set, get) => ({
      events: SEED_EVENTS,
      taskLog: [],           // { id, eventId, title, status, timestamp }
      currentWeekStart: getWorkWeekStart(today),
      searchQuery: '',
      // Sleep/awake zone settings (hours 0-23)
      awakeStart: 6,
      awakeEnd: 24, // midnight = 24 (exclusive end)

      setSearchQuery: (q) => set({ searchQuery: q }),
      setAwakeStart: (h) => set({ awakeStart: h }),
      setAwakeEnd: (h) => set({ awakeEnd: h }),

      nextWeek: () => set((s) => ({ currentWeekStart: addWeek(s.currentWeekStart) })),
      prevWeek: () => set((s) => ({ currentWeekStart: subWeek(s.currentWeekStart) })),
      jumpToDate: (date) => set({ currentWeekStart: getWorkWeekStart(date) }),

      addEvent: (ev) => set((s) => {
        const newEv = { id: genId(), done: false, cancelled: false, recurrence: 'none', recurrenceEnd: '', ...ev }
        const log = {
          id: logId(), eventId: newEv.id, title: newEv.title,
          status: getTaskStatus(newEv), timestamp: new Date().toISOString(),
        }
        return { events: [...s.events, newEv], taskLog: [...s.taskLog, log] }
      }),

      editEvent: (id, changes, editAll = false) => set((s) => ({
        events: s.events.map((e) => {
          if (e.id === id) return { ...e, ...changes }
          if (editAll && e.id === id) return { ...e, ...changes }
          return e
        })
      })),

      deleteEvent: (id) => set((s) => ({
        events: s.events.filter((e) => e.id !== id),
        taskLog: s.taskLog.filter((l) => l.eventId !== id),
      })),

      // Double-click to mark done — logs the status change
      markDone: (id) => set((s) => {
        const ev = s.events.find((e) => e.id === id)
        if (!ev) return {}
        const newDone = !ev.done
        const newStatus = newDone ? 'done' : getTaskStatus({ ...ev, done: false })
        const log = {
          id: logId(), eventId: id, title: ev.title,
          status: newStatus, timestamp: new Date().toISOString(),
        }
        return {
          events: s.events.map((e) => e.id === id ? { ...e, done: newDone } : e),
          taskLog: [...s.taskLog, log],
        }
      }),

      cancelEvent: (id) => set((s) => {
        const ev = s.events.find((e) => e.id === id)
        if (!ev) return {}
        const log = {
          id: logId(), eventId: id, title: ev.title,
          status: 'cancelled', timestamp: new Date().toISOString(),
        }
        return {
          events: s.events.map((e) => e.id === id ? { ...e, cancelled: true, done: false } : e),
          taskLog: [...s.taskLog, log],
        }
      }),

      reschedule: (id, newDate, newTime) => set((s) => ({
        events: s.events.map((e) => e.id === id ? { ...e, date: newDate, time: newTime } : e),
      })),
    }),
    {
      name: 'cal_events',
      partialize: (s) => ({
        events: s.events,
        taskLog: s.taskLog,
        awakeStart: s.awakeStart,
        awakeEnd: s.awakeEnd,
      }),
    }
  )
)
