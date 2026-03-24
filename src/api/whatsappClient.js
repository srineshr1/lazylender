/**
 * WhatsApp Bridge API Client - Multi-Tenant Edition
 * Centralized client for interacting with the multi-tenant WhatsApp bridge server.
 * Handles all HTTP communication, authentication, error handling, and response parsing.
 */

const BRIDGE_URL = import.meta.env.VITE_BRIDGE_URL || 'http://localhost:3001'
const DEFAULT_TIMEOUT = 5000 // 5 seconds
const MAX_RETRIES = 3
const BASE_RETRY_DELAY = 500 // 500ms (faster retries for local bridge)

// Status codes that are safe to retry
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504]

// User credentials storage
let currentUserId = null
let currentApiKey = null

/**
 * Calculate exponential backoff delay with jitter
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {number} Delay in milliseconds
 */
function getRetryDelay(attempt, baseDelay = BASE_RETRY_DELAY) {
  const exponentialDelay = baseDelay * Math.pow(2, attempt)
  const jitter = Math.random() * 250
  return Math.min(exponentialDelay + jitter, 5000) // Cap at 5 seconds
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Check if an error/status code is retryable
 * @param {number|null} status - HTTP status code
 * @param {Error} error - Error object
 * @returns {boolean} Whether the request should be retried
 */
function isRetryable(status, error) {
  if (error?.name === 'AbortError' || 
      error?.message?.includes('Failed to fetch') || 
      error?.message?.includes('NetworkError')) {
    return true
  }
  return status && RETRYABLE_STATUS_CODES.includes(status)
}

/**
 * Custom error class for WhatsApp bridge errors
 */
export class WhatsAppBridgeError extends Error {
  constructor(message, status, originalError) {
    super(message)
    this.name = 'WhatsAppBridgeError'
    this.status = status
    this.originalError = originalError
  }
}

/**
 * Set bridge credentials for the current user
 * Must be called after user logs in
 * @param {string} userId - User ID
 * @param {string} apiKey - Bridge API key
 */
export function setBridgeCredentials(userId, apiKey) {
  currentUserId = userId
  currentApiKey = apiKey
  // Also store in localStorage for persistence
  if (userId && apiKey) {
    localStorage.setItem('bridge_user_id', userId)
    localStorage.setItem('bridge_api_key', apiKey)
  } else {
    localStorage.removeItem('bridge_user_id')
    localStorage.removeItem('bridge_api_key')
  }
}

/**
 * Load credentials from localStorage
 */
export function loadBridgeCredentials() {
  currentUserId = localStorage.getItem('bridge_user_id')
  currentApiKey = localStorage.getItem('bridge_api_key')
  return { userId: currentUserId, apiKey: currentApiKey }
}

/**
 * Get auth headers for bridge requests
 * @returns {object} Headers object
 */
function getBridgeHeaders() {
  if (!currentUserId || !currentApiKey) {
    const stored = loadBridgeCredentials()
    if (!stored.userId || !stored.apiKey) {
      throw new WhatsAppBridgeError(
        'Bridge credentials not set. User must be authenticated.',
        null,
        null
      )
    }
  }
  
  return {
    'X-User-ID': currentUserId,
    'X-API-Key': currentApiKey,
    'Content-Type': 'application/json'
  }
}

/**
 * Get current user ID
 * @returns {string|null} User ID
 */
export function getCurrentUserId() {
  return currentUserId || localStorage.getItem('bridge_user_id')
}

/**
 * Helper function to make fetch requests with timeout and retry
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @param {boolean} skipAuth - Skip authentication headers
 * @param {number} retries - Number of retries (default: MAX_RETRIES)
 * @returns {Promise<Response>} Fetch response
 * @throws {WhatsAppBridgeError} If request times out or fails
 */
async function fetchWithTimeout(url, options = {}, timeout = DEFAULT_TIMEOUT, skipAuth = false, retries = MAX_RETRIES) {
  let lastError = null
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      // Add auth headers to authenticated requests
      const headers = skipAuth ? (options.headers || {}) : {
        ...getBridgeHeaders(),
        ...(options.headers || {})
      }
      
      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      // Check if we should retry on error status codes
      if (!res.ok && isRetryable(res.status, null) && attempt < retries) {
        const delay = getRetryDelay(attempt)
        console.log(`[WhatsApp] Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${retries}) - HTTP ${res.status}`)
        await sleep(delay)
        continue
      }
      
      return res
    } catch (err) {
      clearTimeout(timeoutId)
      lastError = err
      
      // Check if we should retry on network errors
      if (isRetryable(null, err) && attempt < retries) {
        const delay = getRetryDelay(attempt)
        console.log(`[WhatsApp] Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${retries}) - ${err.message}`)
        await sleep(delay)
        continue
      }
      
      if (err.name === 'AbortError') {
        throw new WhatsAppBridgeError(
          `Request timed out after ${timeout}ms`,
          null,
          err
        )
      }
      
      if (err.message.includes('Failed to fetch')) {
        throw new WhatsAppBridgeError(
          'WhatsApp bridge not reachable. Is it running?',
          null,
          err
        )
      }
      
      throw new WhatsAppBridgeError(
        err.message || 'Unknown error connecting to WhatsApp bridge',
        null,
        err
      )
    }
  }
  
  // Should never reach here, but just in case
  throw lastError || new WhatsAppBridgeError('Failed after all retry attempts', null, null)
}

/**
 * Register user with bridge and get API key
 * @param {string} userId - User ID from Supabase
 * @returns {Promise<{userId: string, apiKey: string}>} Registration result
 */
export async function registerWithBridge(userId) {
  try {
    const res = await fetchWithTimeout(
      `${BRIDGE_URL}/register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      },
      DEFAULT_TIMEOUT,
      true // Skip auth for registration
    )
    
    if (!res.ok) {
      throw new WhatsAppBridgeError(
        `Registration failed: HTTP ${res.status}`,
        res.status,
        null
      )
    }
    
    const data = await res.json()
    
    // Store credentials
    setBridgeCredentials(userId, data.apiKey)
    
    return data
  } catch (err) {
    if (err instanceof WhatsAppBridgeError) {
      throw err
    }
    throw new WhatsAppBridgeError('Failed to register with bridge', null, err)
  }
}

/**
 * Connect user's WhatsApp
 * @returns {Promise<void>}
 */
export async function connectWhatsApp() {
  const userId = getCurrentUserId()
  if (!userId) throw new WhatsAppBridgeError('User ID not set', null, null)
  
  try {
    const res = await fetchWithTimeout(
      `${BRIDGE_URL}/users/${userId}/connect`,
      { method: 'POST' }
    )
    
    if (!res.ok) {
      throw new WhatsAppBridgeError(
        `Failed to connect: HTTP ${res.status}`,
        res.status,
        null
      )
    }
    
    return await res.json()
  } catch (err) {
    if (err instanceof WhatsAppBridgeError) throw err
    throw new WhatsAppBridgeError('Failed to connect WhatsApp', null, err)
  }
}

/**
 * Disconnect user's WhatsApp
 * @returns {Promise<void>}
 */
export async function disconnectWhatsApp() {
  const userId = getCurrentUserId()
  if (!userId) throw new WhatsAppBridgeError('User ID not set', null, null)
  
  try {
    const res = await fetchWithTimeout(
      `${BRIDGE_URL}/users/${userId}/disconnect`,
      { method: 'POST' }
    )
    
    if (!res.ok) {
      throw new WhatsAppBridgeError(
        `Failed to disconnect: HTTP ${res.status}`,
        res.status,
        null
      )
    }
    
    return await res.json()
  } catch (err) {
    if (err instanceof WhatsAppBridgeError) throw err
    throw new WhatsAppBridgeError('Failed to disconnect WhatsApp', null, err)
  }
}

/**
 * Get WhatsApp connection status and QR code
 * @returns {Promise<Object>} Status object with connected, qr, and message fields
 */
export async function getStatus() {
  const userId = getCurrentUserId()
  if (!userId) throw new WhatsAppBridgeError('User ID not set', null, null)
  
  try {
    const res = await fetchWithTimeout(`${BRIDGE_URL}/users/${userId}/status`)
    
    if (!res.ok) {
      throw new WhatsAppBridgeError(
        `Bridge returned HTTP ${res.status}: ${res.statusText}`,
        res.status,
        null
      )
    }

    const data = await res.json()
    return {
      connected: data.connected || false,
      qr: data.qr || null,
      message: data.message || (data.connected ? 'Connected' : 'Disconnected'),
      sessionActive: data.sessionActive || false,
      sessionStatus: data.sessionStatus || 'DISCONNECTED',
      qrAttempts: data.qrAttempts || 0,
      maxQrAttempts: data.maxQrAttempts || 3
    }
  } catch (err) {
    if (err instanceof WhatsAppBridgeError) throw err
    throw new WhatsAppBridgeError('Failed to get status from bridge', null, err)
  }
}

/**
 * Get all WhatsApp groups from bridge
 * @returns {Promise<Array>} Array of group objects with id, name, participantCount, messageCount
 */
export async function getGroups() {
  const userId = getCurrentUserId()
  if (!userId) throw new WhatsAppBridgeError('User ID not set', null, null)
  
  try {
    const res = await fetchWithTimeout(`${BRIDGE_URL}/users/${userId}/groups`)
    
    if (!res.ok) {
      throw new WhatsAppBridgeError(
        `Bridge returned HTTP ${res.status}: ${res.statusText}`,
        res.status,
        null
      )
    }

    const groups = await res.json()
    
    if (!Array.isArray(groups)) {
      throw new WhatsAppBridgeError(
        'Bridge returned non-array response for groups',
        null,
        null
      )
    }

    return groups
  } catch (err) {
    if (err instanceof WhatsAppBridgeError) throw err
    throw new WhatsAppBridgeError('Failed to get groups from bridge', null, err)
  }
}

/**
 * Get user's watched groups
 * @returns {Promise<Array>} Array of watched group objects
 */
export async function getWatchedGroups() {
  const userId = getCurrentUserId()
  if (!userId) throw new WhatsAppBridgeError('User ID not set', null, null)
  
  try {
    const res = await fetchWithTimeout(`${BRIDGE_URL}/users/${userId}/watched-groups`)
    
    if (!res.ok) {
      throw new WhatsAppBridgeError(
        `Failed to get watched groups: HTTP ${res.status}`,
        res.status,
        null
      )
    }

    return await res.json()
  } catch (err) {
    if (err instanceof WhatsAppBridgeError) throw err
    throw new WhatsAppBridgeError('Failed to get watched groups', null, err)
  }
}

/**
 * Set user's watched groups
 * @param {Array} groups - Array of group objects { id, name }
 * @returns {Promise<void>}
 */
export async function setWatchedGroups(groups) {
  const userId = getCurrentUserId()
  if (!userId) throw new WhatsAppBridgeError('User ID not set', null, null)
  
  try {
    const res = await fetchWithTimeout(
      `${BRIDGE_URL}/users/${userId}/watched-groups`,
      {
        method: 'POST',
        body: JSON.stringify({ groups })
      }
    )
    
    if (!res.ok) {
      throw new WhatsAppBridgeError(
        `Failed to set watched groups: HTTP ${res.status}`,
        res.status,
        null
      )
    }

    return await res.json()
  } catch (err) {
    if (err instanceof WhatsAppBridgeError) throw err
    throw new WhatsAppBridgeError('Failed to set watched groups', null, err)
  }
}

/**
 * Get events from WhatsApp bridge
 * @returns {Promise<Array>} Array of event objects
 */
export async function getEvents() {
  const userId = getCurrentUserId()
  if (!userId) throw new WhatsAppBridgeError('User ID not set', null, null)
  
  try {
    const res = await fetchWithTimeout(`${BRIDGE_URL}/users/${userId}/events`)
    
    if (!res.ok) {
      throw new WhatsAppBridgeError(
        `Bridge returned HTTP ${res.status}: ${res.statusText}`,
        res.status,
        null
      )
    }

    const events = await res.json()
    
    if (!Array.isArray(events)) {
      throw new WhatsAppBridgeError(
        'Bridge returned non-array response',
        null,
        null
      )
    }

    return events
  } catch (err) {
    if (err instanceof WhatsAppBridgeError) throw err
    throw new WhatsAppBridgeError('Failed to get events from bridge', null, err)
  }
}

/**
 * Clear all events from WhatsApp bridge
 * @returns {Promise<void>}
 */
export async function clearEvents() {
  const userId = getCurrentUserId()
  if (!userId) throw new WhatsAppBridgeError('User ID not set', null, null)
  
  try {
    const res = await fetchWithTimeout(
      `${BRIDGE_URL}/users/${userId}/events`,
      { method: 'DELETE' }
    )
    
    if (!res.ok) {
      throw new WhatsAppBridgeError(
        `Failed to clear events: HTTP ${res.status}`,
        res.status,
        null
      )
    }
  } catch (err) {
    if (err instanceof WhatsAppBridgeError) throw err
    throw new WhatsAppBridgeError('Failed to clear events from bridge', null, err)
  }
}

/**
 * Get group activity statistics
 * @returns {Promise<Object>} Activity object { groupId: messageCount }
 */
export async function getGroupActivity() {
  const userId = getCurrentUserId()
  if (!userId) throw new WhatsAppBridgeError('User ID not set', null, null)
  
  try {
    const res = await fetchWithTimeout(`${BRIDGE_URL}/users/${userId}/group-activity`)
    
    if (!res.ok) {
      throw new WhatsAppBridgeError(
        `Failed to get group activity: HTTP ${res.status}`,
        res.status,
        null
      )
    }

    return await res.json()
  } catch (err) {
    if (err instanceof WhatsAppBridgeError) throw err
    throw new WhatsAppBridgeError('Failed to get group activity', null, err)
  }
}

/**
 * Check if WhatsApp bridge is online
 * @returns {Promise<boolean>} True if bridge is reachable, false otherwise
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${BRIDGE_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Get the configured WhatsApp bridge URL
 * @returns {string} The bridge base URL
 */
export function getBridgeUrl() {
  return BRIDGE_URL
}
