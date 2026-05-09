import { useEffect, useState, useRef, useCallback } from 'react'
import { useChatStore } from '../store/useChatStore'
import { useEventStore } from '../store/useEventStore'
import { useNotificationStore } from '../store/useNotificationStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useAuth } from '../contexts/AuthContext'
import getSupabaseClient from '../lib/supabase'
import { sanitizeString } from '../lib/validation'

const genId = () => 'e' + Date.now() + Math.random().toString(36).slice(2, 6)

function rowToCalendarEvent(row) {
  return {
    id: genId(),
    title: sanitizeString(row.title),
    date: row.date,
    time: typeof row.time === 'string' ? row.time.slice(0, 5) : '09:00',
    duration: row.duration || 60,
    sub: sanitizeString(row.group_name || 'WhatsApp'),
    color: row.color || 'blue',
    recurrence: 'none',
    recurrenceEnd: '',
    done: false,
  }
}

export function useWhatsAppSync() {
  const { addMessage } = useChatStore()
  const { addEvent } = useEventStore()
  const { addNotification } = useNotificationStore()
  const { whatsappAutoAdd } = useSettingsStore()
  const { user } = useAuth()
  const supabase = getSupabaseClient()

  const [lastSyncedEvents, setLastSyncedEvents] = useState([])
  const processedRef = useRef(new Set())
  const autoAddRef = useRef(whatsappAutoAdd)
  useEffect(() => { autoAddRef.current = whatsappAutoAdd }, [whatsappAutoAdd])

  const consumeRow = useCallback(async (row) => {
    if (!row?.id || processedRef.current.has(row.id)) return
    processedRef.current.add(row.id)

    const newEv = rowToCalendarEvent(row)
    const groupLabel = newEv.sub

    if (autoAddRef.current) {
      try {
        addEvent(newEv)
        addMessage({ role: 'ai', text: `📱 Added event from ${groupLabel}: "${newEv.title}"` })
      } catch (err) {
        addMessage({ role: 'ai', text: `⚠ Failed to add WhatsApp event: ${err.message}` })
      }
    } else {
      addMessage({ role: 'ai', text: `📱 Detected event from ${groupLabel}: "${newEv.title}" (auto-add disabled)` })
    }

    setLastSyncedEvents((prev) => [...prev, newEv])
    addNotification({
      type: 'whatsapp',
      title: 'WhatsApp Sync',
      message: `Added event from ${groupLabel}`,
    })

    if (supabase) {
      const { error } = await supabase.from('whatsapp_events').delete().eq('id', row.id)
      if (error) console.warn('[Sync] delete consumed event failed:', error.message)
    }
  }, [addEvent, addMessage, addNotification, supabase])

  // Initial drain + realtime subscription
  useEffect(() => {
    if (!supabase || !user?.id) return

    let cancelled = false

    async function drainPending() {
      const { data, error } = await supabase
        .from('whatsapp_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      if (error) {
        console.warn('[Sync] initial drain failed:', error.message)
        return
      }
      if (cancelled) return
      for (const row of data || []) await consumeRow(row)
    }

    drainPending()

    const channel = supabase
      .channel(`whatsapp_events:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_events',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        consumeRow(payload.new)
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [supabase, user?.id, consumeRow])

  return { lastSyncedEvents }
}
