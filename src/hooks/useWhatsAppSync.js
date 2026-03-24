import { useState, useEffect, useCallback, useRef } from 'react'
import { useChatStore } from '../store/useChatStore'
import { useEventStore } from '../store/useEventStore'
import { useNotificationStore } from '../store/useNotificationStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { getEvents, clearEvents, WhatsAppBridgeError } from '../api/whatsappClient'
import { DEFAULT_POLL_INTERVAL } from '../lib/constants'
import { sanitizeString } from '../lib/validation'

const DEFAULT_POLL = parseInt(import.meta.env.VITE_POLL_INTERVAL || String(DEFAULT_POLL_INTERVAL), 10)

const genId = () => 'e' + Date.now() + Math.random().toString(36).slice(2, 6)

export function useWhatsAppSync() {
  const { addMessage } = useChatStore()
  const { addEvent } = useEventStore()
  const { addNotification } = useNotificationStore()
  const { whatsappPollInterval, whatsappAutoAdd } = useSettingsStore()
  
  const [isConnected, setIsConnected] = useState(false)
  const [lastSyncedEvents, setLastSyncedEvents] = useState([])
  const [syncCount, setSyncCount] = useState(0)
  const pollingRef = useRef(false)
  const processedIdsRef = useRef(new Set())

  const syncEvents = useCallback(async () => {
    if (pollingRef.current) return
    pollingRef.current = true

    try {
      // Use whatsappClient abstraction layer
      const events = await getEvents()
      setIsConnected(true)

      if (events.length > 0) {
        const newEvents = []
        
        events.forEach(ev => {
          // Validate required fields
          if (!ev.id) {
            console.warn('Skipping event without ID:', ev)
            return
          }
          if (!ev.title || !ev.date) {
            console.warn('Skipping event with missing title or date:', ev)
            return
          }

          if (!processedIdsRef.current.has(ev.id)) {
            processedIdsRef.current.add(ev.id)
            
            const newEv = {
              id: genId(),
              title: sanitizeString(ev.title),
              date: ev.date,
              time: ev.time || '09:00',
              duration: ev.duration || 60,
              sub: sanitizeString(ev.group || 'WhatsApp'),
              color: ev.color || 'blue',
              recurrence: 'none',
              recurrenceEnd: '',
              done: false,
            }
            
            // Only auto-add if setting is enabled
            if (whatsappAutoAdd) {
              try {
                addEvent(newEv)
                newEvents.push(newEv)
                
                addMessage({ 
                  role: 'ai', 
                  text: `📱 Added event from ${newEv.sub}: "${newEv.title}"` 
                })
              } catch (addErr) {
                console.error('Failed to add event from WhatsApp:', addErr)
                addMessage({
                  role: 'ai',
                  text: `⚠ Failed to add WhatsApp event: ${addErr.message}`
                })
              }
            } else {
              // Auto-add is disabled, just log the detection
              addMessage({ 
                role: 'ai', 
                text: `📱 Detected event from ${newEv.sub}: "${newEv.title}" (auto-add disabled)` 
              })
            }
          }
        })

        if (newEvents.length > 0) {
          setLastSyncedEvents(newEvents)
          setSyncCount(c => c + newEvents.length)
          
          // Add notification for successful sync
          addNotification({
            type: 'whatsapp',
            title: 'WhatsApp Sync Complete',
            message: `Added ${newEvents.length} event${newEvents.length > 1 ? 's' : ''} from your groups`,
          })
          
          // Clear processed events from bridge
          try {
            await clearEvents()
          } catch (deleteErr) {
            console.warn('Failed to clear WhatsApp events from bridge:', deleteErr)
            // Don't set disconnected - this is not critical
          }
        }
      }
    } catch (err) {
      setIsConnected(false)
      
      // Log errors appropriately based on type
      if (err instanceof WhatsAppBridgeError) {
        if (err.message.includes('timed out')) {
          console.warn('WhatsApp sync timed out')
        } else if (err.message.includes('not reachable')) {
          console.warn('WhatsApp bridge not reachable. Is it running?')
        } else {
          console.error('WhatsApp sync error:', err.message)
        }
      } else {
        console.error('WhatsApp sync error:', err)
      }
    } finally {
      pollingRef.current = false
    }
  }, [addEvent, addMessage, whatsappAutoAdd])

  useEffect(() => {
    syncEvents()
    
    // Use poll interval from settings, default to env var or constant
    const pollInterval = (whatsappPollInterval || DEFAULT_POLL) * 1000
    const interval = setInterval(syncEvents, pollInterval)
    
    return () => clearInterval(interval)
  }, [syncEvents, whatsappPollInterval])

  return {
    isConnected,
    lastSyncedEvents,
    syncCount,
  }
}
