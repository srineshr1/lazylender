import { useEffect, useRef, useCallback } from 'react'
import { getBridgeUrl, getCurrentUserId } from '../api/whatsappClient'

const WS_RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000]
const MAX_WS_CONNECT_ATTEMPTS = 3

export function useWhatsAppWebSocket({ onNewEvents }) {
  const wsRef = useRef(null)
  const reconnectAttemptRef = useRef(0)
  const reconnectTimeoutRef = useRef(null)
  const isUnmountedRef = useRef(false)
  const processedIdsRef = useRef(new Set())
  const onNewEventsRef = useRef(onNewEvents)
  useEffect(() => { onNewEventsRef.current = onNewEvents }, [onNewEvents])

  const getWebSocketUrl = useCallback(() => {
    const bridgeUrl = getBridgeUrl()
    if (!bridgeUrl) return null

    // Convert http/https to ws/wss
    const wsUrl = bridgeUrl.replace(/^http/, 'ws')
    return `${wsUrl}/ws`
  }, [])

  const clearProcessedIds = useCallback(() => {
    processedIdsRef.current.clear()
  }, [])

  const connect = useCallback(() => {
    if (isUnmountedRef.current) return

    const url = getWebSocketUrl()
    if (!url) {
      console.log('[WS] No bridge URL available, skipping WebSocket connection')
      return
    }

    const userId = getCurrentUserId()
    if (!userId) {
      console.log('[WS] No user ID yet, skipping connection')
      return
    }

    // Get stored credentials
    const apiKey = sessionStorage.getItem('bridge_api_key')
    if (!apiKey) {
      console.log('[WS] No API key yet, skipping connection')
      return
    }

    console.log('[WS] Connecting to:', url)

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[WS] Connected, authenticating...')
        reconnectAttemptRef.current = 0

        // Send auth message
        ws.send(JSON.stringify({
          type: 'auth',
          userId,
          apiKey
        }))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'auth_ok') {
            console.log('[WS] Authenticated successfully')
            return
          }

          if (data.type === 'auth_error') {
            console.error('[WS] Auth failed:', data.message)
            ws.close()
            return
          }

          if (data.type === 'new_events') {
            const events = Array.isArray(data.events) ? data.events : []
            console.log(`[WS] Received ${events.length} new event(s)`)

            // Deduplicate and process events
            for (const ev of events) {
              if (!ev.id) continue
              if (processedIdsRef.current.has(ev.id)) continue
              processedIdsRef.current.add(ev.id)

              if (onNewEventsRef.current) {
                onNewEventsRef.current(ev)
              }
            }
          }
        } catch (err) {
          console.error('[WS] Message parse error:', err)
        }
      }

      ws.onclose = (event) => {
        console.log(`[WS] Disconnected (code: ${event.code})`)
        wsRef.current = null

        if (isUnmountedRef.current) return

        // Exponential backoff reconnection
        const delay = WS_RECONNECT_DELAYS[Math.min(reconnectAttemptRef.current, WS_RECONNECT_DELAYS.length - 1)]
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current + 1})`)
        reconnectAttemptRef.current++

        reconnectTimeoutRef.current = setTimeout(connect, delay)
      }

      ws.onerror = (err) => {
        console.error('[WS] Error:', err)
      }
    } catch (err) {
      console.error('[WS] Failed to create WebSocket:', err)
    }
  }, [getWebSocketUrl])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  useEffect(() => {
    isUnmountedRef.current = false
    reconnectAttemptRef.current = 0

    // Try to connect, with fallback if no bridge URL
    connect()

    return () => {
      isUnmountedRef.current = true
      disconnect()
    }
  }, [connect, disconnect])

  return {
    clearProcessedIds,
    reconnect: connect,
    disconnect,
  }
}