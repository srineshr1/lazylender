import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import getSupabaseClient from '../lib/supabase'

const DEFAULT_STATUS = {
  status: 'DISCONNECTED',
  connected: false,
  qr: null,
  message: 'Disconnected',
}

function rowToStatus(row) {
  if (!row) return DEFAULT_STATUS
  return {
    status: row.status || 'DISCONNECTED',
    connected: !!row.connected,
    qr: row.qr || null,
    message: row.message || (row.connected ? 'Connected' : 'Disconnected'),
  }
}

export function useWhatsAppBridgeStatus() {
  const { user } = useAuth()
  const supabase = getSupabaseClient()
  const [status, setStatus] = useState(DEFAULT_STATUS)

  useEffect(() => {
    if (!supabase || !user?.id) {
      setStatus(DEFAULT_STATUS)
      return
    }

    let cancelled = false

    async function loadInitial() {
      const { data, error } = await supabase
        .from('whatsapp_status')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) console.warn('[Status] load failed:', error.message)
      if (!cancelled) setStatus(rowToStatus(data))
    }

    loadInitial()

    const channel = supabase
      .channel(`whatsapp_status:${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_status',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setStatus(DEFAULT_STATUS)
        } else {
          setStatus(rowToStatus(payload.new))
        }
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [supabase, user?.id])

  return status
}
