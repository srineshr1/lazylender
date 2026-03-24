/**
 * Ollama API Client
 * Centralized client for interacting with the Ollama LLM API.
 * Handles all HTTP communication, error handling, response parsing, timeout, and retry logic.
 */

const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434'
const REQUEST_TIMEOUT = 30000
const RETRY_DELAYS = [0, 2000, 5000]
const MAX_RETRIES = 3

export class OllamaError extends Error {
  constructor(message, status, originalError) {
    super(message)
    this.name = 'OllamaError'
    this.status = status
    this.originalError = originalError
  }
}

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

async function generateTextWithRetry({ model, prompt, stream = false, options = {}, attempt = 0 }) {
  let lastError
  
  for (let i = attempt; i < MAX_RETRIES; i++) {
    try {
      const res = await fetchWithTimeout(
        `${OLLAMA_URL}/api/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, prompt, stream, options }),
        },
        REQUEST_TIMEOUT
      )

      if (!res.ok) {
        if (res.status === 404) {
          throw new OllamaError(
            `Model "${model}" not found. Try: ollama pull ${model}`,
            404,
            null
          )
        } else if (res.status === 500) {
          throw new OllamaError(
            'Ollama server error. Try restarting: ollama serve',
            500,
            null
          )
        } else {
          throw new OllamaError(
            `HTTP ${res.status}: ${res.statusText}`,
            res.status,
            null
          )
        }
      }

      let data
      try {
        data = await res.json()
      } catch (parseErr) {
        throw new OllamaError(
          'Invalid response from Ollama server',
          null,
          parseErr
        )
      }

      if (!data.response && data.response !== '') {
        throw new OllamaError(
          'Ollama response missing "response" field',
          null,
          null
        )
      }

      return data
    } catch (err) {
      lastError = err
      
      if (err instanceof OllamaError) {
        if (err.status === 404 || err.status === 400) {
          throw err
        }
      }
      
      if (err.name === 'AbortError' || err.message.includes('timeout')) {
        const delay = RETRY_DELAYS[i]
        if (delay > 0 && i < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        throw new OllamaError(
          'Request timed out. Ollama may be overloaded or the model is too slow.',
          null,
          err
        )
      }
      
      if (i < MAX_RETRIES - 1) {
        const delay = RETRY_DELAYS[i]
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
        continue
      }
    }
  }
  
  if (lastError instanceof OllamaError) {
    throw lastError
  }
  
  if (lastError?.message?.includes('Failed to fetch') || lastError?.message?.includes('NetworkError')) {
    throw new OllamaError(
      'Failed to connect to Ollama. Make sure Ollama is running (ollama serve)',
      null,
      lastError
    )
  }
  
  throw new OllamaError(
    lastError?.message || 'Unknown error occurred while connecting to Ollama',
    null,
    lastError
  )
}

export async function generateText({ model, prompt, stream = false, options = {} }) {
  if (!model) {
    throw new OllamaError('Model name is required', null, null)
  }
  if (!prompt) {
    throw new OllamaError('Prompt is required', null, null)
  }

  return generateTextWithRetry({ model, prompt, stream, options })
}

/**
 * Check if Ollama is running and reachable
 * 
 * @returns {Promise<boolean>} True if Ollama is online, false otherwise
 * 
 * @example
 * const isOnline = await checkHealth()
 * if (isOnline) {
 *   console.log('Ollama is running')
 * }
 */
export async function checkHealth() {
  try {
    const res = await fetchWithTimeout(`${OLLAMA_URL}/api/tags`, { method: 'GET' }, 5000)
    return res.ok
  } catch {
    return false
  }
}

/**
 * List all available models
 * 
 * @returns {Promise<Array>} List of model objects with name, size, etc.
 * @throws {OllamaError} If the request fails
 * 
 * @example
 * const models = await listModels()
 * console.log(models) // [{ name: 'llama3.2:3b', size: '2.0 GB', ... }]
 */
export async function listModels() {
  try {
    const res = await fetchWithTimeout(`${OLLAMA_URL}/api/tags`, { method: 'GET' }, REQUEST_TIMEOUT)

    if (!res.ok) {
      throw new OllamaError(
        `Failed to list models: HTTP ${res.status}`,
        res.status,
        null
      )
    }

    const data = await res.json()
    return data.models || []
  } catch (err) {
    if (err instanceof OllamaError) {
      throw err
    }

    throw new OllamaError(
      'Failed to connect to Ollama while listing models',
      null,
      err
    )
  }
}

/**
 * Get the configured Ollama URL
 * 
 * @returns {string} The Ollama API base URL
 * 
 * @example
 * console.log(getOllamaUrl()) // "http://localhost:11434"
 */
export function getOllamaUrl() {
  return OLLAMA_URL
}
