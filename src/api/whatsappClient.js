/**
 * WhatsApp Bridge API Client
 *
 * Bridge state lives in Supabase. This client only handles three control
 * actions (connect/disconnect/logout) plus the Groq chat proxy. All reads
 * (status, chats, watched, events) come from Supabase directly via Realtime
 * or table queries elsewhere in the app.
 */

const BRIDGE_URL = import.meta.env.VITE_BRIDGE_URL
  ? import.meta.env.VITE_BRIDGE_URL
  : (import.meta.env.DEV ? '' : '')
const DEFAULT_TIMEOUT = 20000

let currentUserId = null
let currentApiKey = null

export class WhatsAppBridgeError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'WhatsAppBridgeError'
    this.status = status
  }
}

export function setBridgeCredentials(userId, apiKey) {
  currentUserId = userId || null
  currentApiKey = apiKey || null
  if (userId && apiKey) {
    sessionStorage.setItem('bridge_user_id', userId)
    sessionStorage.setItem('bridge_api_key', apiKey)
  } else {
    sessionStorage.removeItem('bridge_user_id')
    sessionStorage.removeItem('bridge_api_key')
  }
}

export function loadBridgeCredentials() {
  currentUserId = sessionStorage.getItem('bridge_user_id')
  currentApiKey = sessionStorage.getItem('bridge_api_key')
  return { userId: currentUserId, apiKey: currentApiKey }
}

export function getCurrentUserId() {
  return currentUserId || sessionStorage.getItem('bridge_user_id')
}

export function getBridgeUrl() {
  return BRIDGE_URL
}

export function hasCredentials() {
  if (currentUserId && currentApiKey) return true
  loadBridgeCredentials()
  return !!(currentUserId && currentApiKey)
}

function authHeaders() {
  if (!currentUserId || !currentApiKey) loadBridgeCredentials()
  if (!currentUserId || !currentApiKey) {
    throw new WhatsAppBridgeError('Bridge credentials not set', null)
  }
  return {
    'X-User-ID': currentUserId,
    'X-API-Key': currentApiKey,
    'Content-Type': 'application/json',
  }
}

async function bridgeFetch(path, { method = 'GET', body } = {}) {
  const url = `${BRIDGE_URL}${path}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT)
  try {
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
    if (!res.ok) {
      let msg = `HTTP ${res.status}`
      try {
        const err = await res.json()
        msg = err.message || err.error || msg
      } catch {}
      throw new WhatsAppBridgeError(msg, res.status)
    }
    return res.json()
  } catch (err) {
    if (err instanceof WhatsAppBridgeError) throw err
    if (err.name === 'AbortError') throw new WhatsAppBridgeError('Bridge request timed out', null)
    throw new WhatsAppBridgeError(err.message || 'Bridge connection error', null)
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function connectWhatsApp() {
  const userId = getCurrentUserId()
  if (!userId) throw new WhatsAppBridgeError('User ID not set', null)
  return bridgeFetch(`/users/${userId}/connect`, { method: 'POST' })
}

export async function disconnectWhatsApp() {
  const userId = getCurrentUserId()
  if (!userId) throw new WhatsAppBridgeError('User ID not set', null)
  return bridgeFetch(`/users/${userId}/disconnect`, { method: 'POST' })
}

export async function logoutWhatsApp() {
  const userId = getCurrentUserId()
  if (!userId) throw new WhatsAppBridgeError('User ID not set', null)
  return bridgeFetch(`/users/${userId}/logout`, { method: 'POST' })
}

export async function checkHealth() {
  try {
    const res = await fetch(`${BRIDGE_URL}/health`, { method: 'GET' })
    return res.ok
  } catch {
    return false
  }
}
