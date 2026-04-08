/**
 * Groq API Client
 * Centralized client for interacting with the Groq LLM API.
 * Uses OpenAI-compatible chat completions endpoint.
 * Can proxy through bridge server to hide API key.
 * Supports multimodal (vision) for image analysis.
 */

import * as pdfjsLib from 'pdfjs-dist'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const BRIDGE_URL = import.meta.env.VITE_BRIDGE_URL || ''
const USE_BRIDGE_PROXY = import.meta.env.VITE_USE_BRIDGE_PROXY === 'true'
const REQUEST_TIMEOUT = 30000 // 30 seconds
const VISION_TIMEOUT = 60000 // 60 seconds for vision (larger payloads)
const MAX_RETRIES = 3
const BASE_RETRY_DELAY = 1000 // 1 second

// Models
const TEXT_MODEL = 'llama-3.3-70b-versatile'
const VISION_MODEL = 'llama-3.2-90b-vision-preview' // Groq's vision model

// Status codes that are safe to retry
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504]

// Get current user ID from session storage
function getCurrentUserId() {
  return sessionStorage.getItem('bridge_user_id')
}

// Get current bridge API key from session storage
function getCurrentBridgeApiKey() {
  return sessionStorage.getItem('bridge_api_key')
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
 */
function getRetryDelay(attempt, baseDelay = BASE_RETRY_DELAY) {
  const exponentialDelay = baseDelay * Math.pow(2, attempt)
  const jitter = Math.random() * 500
  return Math.min(exponentialDelay + jitter, 10000)
}

/**
 * Check if an error/status code is retryable
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
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Get the appropriate model for the request
 * @param {boolean} hasImages - Whether the request includes images
 * @returns {string} Model name
 */
export function getModelForRequest(hasImages = false) {
  return hasImages ? VISION_MODEL : TEXT_MODEL
}

/**
 * Extract text content from a PDF file using PDF.js
 * @param {File|Blob|ArrayBuffer} pdfData - PDF file data
 * @returns {Promise<string>} Extracted text content
 */
export async function extractTextFromPDF(pdfData) {
  try {
    let arrayBuffer
    if (pdfData instanceof ArrayBuffer) {
      arrayBuffer = pdfData
    } else if (pdfData instanceof Blob || pdfData instanceof File) {
      arrayBuffer = await pdfData.arrayBuffer()
    } else {
      throw new Error('Invalid PDF data type')
    }

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    let fullText = ''
    const maxPages = 50
    const numPages = Math.min(pdf.numPages, maxPages)
    
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ')
      fullText += pageText + '\n\n'
    }
    
    if (fullText.length > 12000) {
      fullText = fullText.slice(0, 12000) + '\n\n[... content truncated ...]'
    }
    
    return fullText.trim()
  } catch (error) {
    console.error('[GroqClient] PDF extraction failed:', error)
    throw new GroqError(
      'Failed to extract text from PDF. The file may be corrupted or password-protected.',
      null,
      error
    )
  }
}

/**
 * Convert a File to base64 data URL
 * @param {File} file - File to convert
 * @returns {Promise<string>} Base64 data URL
 */
export async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Build multimodal message content for vision requests
 * @param {string} text - Text prompt
 * @param {Array<{type: string, url: string}>} attachments - Image attachments
 * @returns {Array} Message content array for Groq API
 */
export function buildMultimodalContent(text, attachments = []) {
  const content = []
  
  if (text) {
    content.push({ type: 'text', text })
  }
  
  attachments.forEach(attachment => {
    if (attachment.type === 'image' && attachment.url) {
      content.push({
        type: 'image_url',
        image_url: { url: attachment.url }
      })
    }
  })
  
  return content
}

/**
 * Generate text using Groq API with support for multimodal (vision) requests
 * 
 * @param {Object} params - Generation parameters
 * @param {string} params.model - Model name (auto-selected if not specified)
 * @param {Array} params.messages - Array of message objects with role and content
 * @param {number} params.temperature - Sampling temperature (0-2, default: 0.1)
 * @param {number} params.maxTokens - Maximum tokens to generate (default: 1000)
 * @param {Array} params.attachments - Optional attachments for vision (images)
 * @returns {Promise<Object>} Response object with response text, model, and usage stats
 * @throws {GroqError} If the request fails
 */
export async function generateText({ 
  model, 
  messages, 
  temperature = 0.1, 
  maxTokens = 1000,
  attachments = [],
  retries = MAX_RETRIES
}) {
  // Determine if this is a vision request
  const hasImages = attachments?.some(a => a.type === 'image') || false
  const effectiveModel = model || getModelForRequest(hasImages)
  const timeout = hasImages ? VISION_TIMEOUT : REQUEST_TIMEOUT
  
  // Process messages for multimodal if needed
  let processedMessages = [...messages]
  if (hasImages && processedMessages.length > 0) {
    const lastUserMsgIndex = processedMessages.findLastIndex(m => m.role === 'user')
    if (lastUserMsgIndex !== -1) {
      const lastUserMsg = processedMessages[lastUserMsgIndex]
      const textContent = typeof lastUserMsg.content === 'string' 
        ? lastUserMsg.content 
        : (lastUserMsg.content?.[0]?.text || '')
      
      processedMessages[lastUserMsgIndex] = {
        ...lastUserMsg,
        content: buildMultimodalContent(textContent, attachments)
      }
    }
  }

  // Determine if we should use bridge proxy
  const bridgeUserId = getCurrentUserId()
  const bridgeApiKey = getCurrentBridgeApiKey()
  const useProxy = USE_BRIDGE_PROXY && BRIDGE_URL && bridgeUserId
  
  // Production hard-guard
  if (USE_BRIDGE_PROXY && !BRIDGE_URL) {
    throw new GroqError(
      'VITE_USE_BRIDGE_PROXY is true but VITE_BRIDGE_URL is not set.',
      null,
      null
    )
  }

  // Validate credentials
  if (!useProxy && !GROQ_API_KEY) {
    throw new GroqError(
      'AI service not configured. Set VITE_USE_BRIDGE_PROXY=true or add VITE_GROQ_API_KEY.',
      null,
      null
    )
  }

  if (useProxy && !bridgeApiKey) {
    throw new GroqError(
      'Bridge credentials missing. Please refresh the page or sign out and sign back in.',
      401,
      null
    )
  }

  if (!processedMessages || processedMessages.length === 0) {
    throw new GroqError('Messages array is required and must not be empty', null, null)
  }

  let lastError = null
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = useProxy 
        ? `${BRIDGE_URL}/users/${bridgeUserId}/chat`
        : GROQ_API_URL
      
      const headers = useProxy
        ? {
            'Content-Type': 'application/json',
            'X-User-ID': bridgeUserId,
            'X-API-Key': bridgeApiKey,
          }
        : { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' }
      
      const body = useProxy
        ? JSON.stringify({ model: effectiveModel, messages: processedMessages, temperature, maxTokens })
        : JSON.stringify({ model: effectiveModel, messages: processedMessages, temperature, max_tokens: maxTokens })
      
      const res = await fetchWithTimeout(url, { method: 'POST', headers, body }, timeout)

      if (!res.ok) {
        let errorData
        try {
          errorData = await res.json()
        } catch {
          errorData = {}
        }

        const apiErrorMessage =
          errorData?.error?.message ||
          errorData?.message ||
          (typeof errorData?.error === 'string' ? errorData.error : null)
        
        if (res.status === 401) {
          throw new GroqError(
            useProxy ? 'AI service authentication failed' : 'Invalid Groq API key.',
            401,
            null
          )
        }
        
        if (res.status === 400) {
          throw new GroqError(
            apiErrorMessage || 'Invalid request. Check your parameters.',
            400,
            null
          )
        }
        
        if (isRetryable(res.status, null) && attempt < retries) {
          const delay = getRetryDelay(attempt)
          console.log(`[Groq] Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${retries}) - HTTP ${res.status}`)
          await sleep(delay)
          continue
        }
        
        if (res.status === 429) {
          throw new GroqError('Rate limit exceeded. Please try again in a moment.', 429, null)
        }
        
        if (res.status === 503) {
          throw new GroqError('Groq API is temporarily unavailable. Please try again.', 503, null)
        }
        
        throw new GroqError(
          apiErrorMessage || `HTTP ${res.status}: ${res.statusText}`,
          res.status,
          null
        )
      }

      let data
      try {
        data = await res.json()
      } catch (parseErr) {
        throw new GroqError('Invalid JSON response from Groq API', null, parseErr)
      }

      if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        throw new GroqError('Groq API returned an empty or invalid response', null, null)
      }

      if (!data.choices[0]?.message?.content) {
        throw new GroqError('Groq API response missing message content', null, null)
      }

      return {
        response: data.choices[0].message.content,
        model: data.model,
        usage: data.usage || null,
        attempts: attempt + 1
      }
    } catch (err) {
      lastError = err
      
      if (err instanceof GroqError && !isRetryable(err.status, null)) {
        throw err
      }
      
      if (isRetryable(null, err) && attempt < retries) {
        const delay = getRetryDelay(attempt)
        console.log(`[Groq] Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${retries}) - ${err.message}`)
        await sleep(delay)
        continue
      }
      
      if (err instanceof GroqError) {
        throw err
      }
      
      if (err.name === 'AbortError') {
        throw new GroqError(`Request timed out after ${timeout / 1000} seconds.`, null, err)
      }
      
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        throw new GroqError('Failed to connect to Groq API. Check your internet connection.', null, err)
      }
      
      throw new GroqError(err.message || 'Unknown error occurred', null, err)
    }
  }
  
  throw lastError || new GroqError('Failed after all retry attempts', null, null)
}

/**
 * Check if Groq API is accessible and the API key is valid
 * @returns {Promise<boolean>} True if API is reachable and key is valid
 */
export async function checkHealth() {
  if (USE_BRIDGE_PROXY && BRIDGE_URL) {
    try {
      const userId = getCurrentUserId()
      if (!userId) return false
      const res = await fetchWithTimeout(`${BRIDGE_URL}/health`, { method: 'GET' }, 5000)
      return res.ok
    } catch {
      return false
    }
  }

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
          model: TEXT_MODEL,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        })
      },
      5000
    )
    return res.ok || res.status === 429
  } catch {
    return false
  }
}

/**
 * Get the configured Groq API URL
 * @returns {string} The Groq API base URL
 */
export function getGroqUrl() {
  return GROQ_API_URL
}

/**
 * Check if API key is configured
 * @returns {boolean} True if API key is set
 */
export function hasApiKey() {
  return !!GROQ_API_KEY
}
