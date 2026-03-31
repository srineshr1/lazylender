/**
 * Groq API Client
 * Centralized client for interacting with the Groq LLM API.
 * Uses OpenAI-compatible chat completions endpoint.
 * Can proxy through bridge server to hide API key.
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const BRIDGE_URL = import.meta.env.VITE_BRIDGE_URL || ''
const USE_BRIDGE_PROXY = import.meta.env.VITE_USE_BRIDGE_PROXY === 'true'
const REQUEST_TIMEOUT = 30000 // 30 seconds
const MAX_RETRIES = 3
const BASE_RETRY_DELAY = 1000 // 1 second

// Status codes that are safe to retry
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504]

// Get current user ID from session storage
function getCurrentUserId() {
  return sessionStorage.getItem('bridge_user_id')
}

/**
 * Custom error class for Groq API errors
 */
export class GroqError extends Error {
  constructor(message, status, originalError) {
    super(message)
    this.name = 'GroqError'
    this.status = status
    this.originalError = originalError
  }
}

/**
 * Calculate exponential backoff delay with jitter
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {number} Delay in milliseconds
 */
function getRetryDelay(attempt, baseDelay = BASE_RETRY_DELAY) {
  // Exponential backoff: 1s, 2s, 4s + random jitter (0-500ms)
  const exponentialDelay = baseDelay * Math.pow(2, attempt)
  const jitter = Math.random() * 500
  return Math.min(exponentialDelay + jitter, 10000) // Cap at 10 seconds
}

/**
 * Check if an error/status code is retryable
 * @param {number|null} status - HTTP status code
 * @param {Error} error - Error object
 * @returns {boolean} Whether the request should be retried
 */
function isRetryable(status, error) {
  // Network errors are retryable
  if (error?.name === 'AbortError' || 
      error?.message?.includes('Failed to fetch') || 
      error?.message?.includes('NetworkError')) {
    return true
  }
  // Specific HTTP status codes are retryable
  return status && RETRYABLE_STATUS_CODES.includes(status)
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(url, options, timeout) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return res
  } finally {
    clearTimeout(timeoutId)
  }
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
 * Generate text using Groq API
 * 
 * @param {Object} params - Generation parameters
 * @param {string} params.model - Model name (e.g., 'llama-3.3-70b-versatile')
 * @param {Array} params.messages - Array of message objects with role and content
 * @param {number} params.temperature - Sampling temperature (0-2, default: 0.1)
 * @param {number} params.maxTokens - Maximum tokens to generate (default: 1000)
 * @returns {Promise<Object>} Response object with response text, model, and usage stats
 * @throws {GroqError} If the request fails
 * 
 * @example
 * const result = await generateText({
 *   model: 'llama-3.3-70b-versatile',
 *   messages: [
 *     { role: 'system', content: 'You are a helpful assistant' },
 *     { role: 'user', content: 'Hello!' }
 *   ],
 *   temperature: 0.1
 * })
 * console.log(result.response) // AI's response text
 */
export async function generateText({ 
  model, 
  messages, 
  temperature = 0.1, 
  maxTokens = 1000,
  retries = MAX_RETRIES
}) {
  // Determine if we should use bridge proxy
  const useProxy = USE_BRIDGE_PROXY && BRIDGE_URL && getCurrentUserId()
  
  // Production hard-guard: if bridge proxy is configured, NEVER fall back to direct key
  if (USE_BRIDGE_PROXY && !BRIDGE_URL) {
    throw new GroqError(
      'VITE_USE_BRIDGE_PROXY is true but VITE_BRIDGE_URL is not set. Set VITE_BRIDGE_URL to your Railway service URL.',
      null,
      null
    )
  }

  // Validate - either proxy or direct API key
  if (!useProxy && !GROQ_API_KEY) {
    throw new GroqError(
      'AI service not configured. Set VITE_USE_BRIDGE_PROXY=true or add VITE_GROQ_API_KEY to your .env file.',
      null,
      null
    )
  }

  // Validate required parameters
  if (!model && !useProxy) {
    throw new GroqError('Model name is required', null, null)
  }
  
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new GroqError('Messages array is required and must not be empty', null, null)
  }

  let lastError = null
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Use bridge proxy if enabled
      const url = useProxy 
        ? `${BRIDGE_URL}/users/${getCurrentUserId()}/chat`
        : GROQ_API_URL
      
      const headers = useProxy
        ? { 'Content-Type': 'application/json' }
        : { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' }
      
      const body = useProxy
        ? JSON.stringify({ model, messages, temperature, maxTokens })
        : JSON.stringify({ model, messages, temperature, max_tokens: maxTokens })
      
      const res = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers,
          body
        },
        REQUEST_TIMEOUT
      )

      // Handle HTTP errors
      if (!res.ok) {
        let errorData
        try {
          errorData = await res.json()
        } catch {
          errorData = {}
        }
        
        // Non-retryable errors - throw immediately
        if (res.status === 401) {
          throw new GroqError(
            useProxy ? 'AI service authentication failed' : 'Invalid Groq API key. Please check configuration.',
            401,
            null
          )
        }
        
        if (res.status === 400) {
          throw new GroqError(
            errorData.error?.message || 'Invalid request. Check your parameters.',
            400,
            null
          )
        }
        
        // Retryable errors - check if we should retry
        if (isRetryable(res.status, null) && attempt < retries) {
          const delay = getRetryDelay(attempt)
          console.log(`[Groq] Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${retries}) - HTTP ${res.status}`)
          await sleep(delay)
          continue
        }
        
        // Final attempt for retryable errors
        if (res.status === 429) {
          throw new GroqError(
            'Rate limit exceeded. Please try again in a moment.',
            429,
            null
          )
        }
        
        if (res.status === 503) {
          throw new GroqError(
            'Groq API is temporarily unavailable. Please try again.',
            503,
            null
          )
        }
        
        // Generic HTTP error
        throw new GroqError(
          errorData.error?.message || `HTTP ${res.status}: ${res.statusText}`,
          res.status,
          null
        )
      }

      // Parse response
      let data
      try {
        data = await res.json()
      } catch (parseErr) {
        throw new GroqError(
          'Invalid JSON response from Groq API',
          null,
          parseErr
        )
      }

      // Validate response structure
      if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        throw new GroqError(
          'Groq API returned an empty or invalid response',
          null,
          null
        )
      }

      if (!data.choices[0]?.message?.content) {
        throw new GroqError(
          'Groq API response missing message content',
          null,
          null
        )
      }

      // Return normalized response
      return {
        response: data.choices[0].message.content,
        model: data.model,
        usage: data.usage || null,
        attempts: attempt + 1
      }
    } catch (err) {
      lastError = err
      
      // Re-throw GroqError for non-retryable errors
      if (err instanceof GroqError && !isRetryable(err.status, null)) {
        throw err
      }
      
      // Check if we should retry network/timeout errors
      if (isRetryable(null, err) && attempt < retries) {
        const delay = getRetryDelay(attempt)
        console.log(`[Groq] Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${retries}) - ${err.message}`)
        await sleep(delay)
        continue
      }
      
      // Final attempt - throw appropriate error
      if (err instanceof GroqError) {
        throw err
      }
      
      // Handle timeout/abort errors
      if (err.name === 'AbortError') {
        throw new GroqError(
          'Request timed out after 30 seconds. Please try again.',
          null,
          err
        )
      }
      
      // Handle network errors
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        throw new GroqError(
          'Failed to connect to Groq API. Check your internet connection.',
          null,
          err
        )
      }
      
      // Generic error fallback
      throw new GroqError(
        err.message || 'Unknown error occurred while connecting to Groq API',
        null,
        err
      )
    }
  }
  
  // Should never reach here, but just in case
  throw lastError || new GroqError('Failed after all retry attempts', null, null)
}

/**
 * Check if Groq API is accessible and the API key is valid
 * 
 * @returns {Promise<boolean>} True if API is reachable and key is valid
 * 
 * @example
 * const isOnline = await checkHealth()
 * if (isOnline) {
 *   console.log('Groq API is ready')
 * }
 */
export async function checkHealth() {
  // If bridge proxy is configured, check the bridge's health endpoint instead.
  // This avoids using the Groq API key directly in the browser.
  if (USE_BRIDGE_PROXY && BRIDGE_URL) {
    try {
      const userId = getCurrentUserId()
      if (!userId) return false
      const res = await fetchWithTimeout(
        `${BRIDGE_URL}/health`,
        { method: 'GET' },
        5000
      )
      return res.ok
    } catch {
      return false
    }
  }

  // Direct key path — only valid in local dev without bridge proxy
  if (!GROQ_API_KEY) {
    return false
  }

  try {
    const res = await fetchWithTimeout(
      GROQ_API_URL,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        })
      },
      5000 // 5 second timeout for health check
    )
    
    // Consider 401 as unhealthy (invalid key), but 200 and 429 as healthy
    return res.ok || res.status === 429
  } catch {
    return false
  }
}

/**
 * Get the configured Groq API URL
 * 
 * @returns {string} The Groq API base URL
 */
export function getGroqUrl() {
  return GROQ_API_URL
}

/**
 * Check if API key is configured
 * 
 * @returns {boolean} True if API key is set
 */
export function hasApiKey() {
  return !!GROQ_API_KEY
}
