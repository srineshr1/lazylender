const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

/**
 * Bridge Authentication Middleware
 * Validates user API keys and enforces per-user access control
 */

const API_KEYS_FILE = path.join(__dirname, '..', 'config', 'api-keys.json')

function isDevAuthBypassEnabled() {
  return process.env.BRIDGE_REQUIRE_AUTH === 'false' && process.env.NODE_ENV === 'development'
}

function isValidUserId(userId) {
  return typeof userId === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(userId)
}

// Ensure config directory exists
const configDir = path.dirname(API_KEYS_FILE)
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true })
}

// Initialize API keys file if it doesn't exist
if (!fs.existsSync(API_KEYS_FILE)) {
  fs.writeFileSync(API_KEYS_FILE, JSON.stringify({}, null, 2), { mode: 0o600 })
}

function atomicWriteJson(filePath, value) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(tempPath, value, { mode: 0o600 })
  fs.renameSync(tempPath, filePath)
}

/**
 * Load API keys from file
 * @returns {object} API keys object { userId: apiKey }
 */
function loadApiKeys() {
  try {
    const data = fs.readFileSync(API_KEYS_FILE, 'utf8')
    return JSON.parse(data)
  } catch (err) {
    console.error('Failed to load API keys:', err.message)
    return {}
  }
}

/**
 * Save API keys to file
 * @param {object} keys - API keys object
 */
function saveApiKeys(keys) {
  try {
    atomicWriteJson(API_KEYS_FILE, JSON.stringify(keys, null, 2))
  } catch (err) {
    console.error('Failed to save API keys:', err.message)
  }
}

/**
 * Generate new API key for user
 * @param {string} userId - User ID
 * @returns {string} Generated API key
 */
function generateApiKey(userId) {
  const randomBytes = crypto.randomBytes(24).toString('hex')
  return `wa_bridge_${randomBytes}`
}

/**
 * Create or retrieve API key for user
 * @param {string} userId - User ID
 * @returns {string} API key
 */
function getOrCreateApiKey(userId) {
  if (!isValidUserId(userId)) {
    throw new Error('Invalid userId format')
  }

  const keys = loadApiKeys()
  
  if (keys[userId]) {
    return keys[userId]
  }
  
  // Generate new key
  const apiKey = generateApiKey(userId)
  keys[userId] = apiKey
  saveApiKeys(keys)
  
  console.log(`[Auth] Generated new API key for user: ${userId}`)
  return apiKey
}

/**
 * Validate API key for user
 * @param {string} userId - User ID
 * @param {string} apiKey - API key to validate
 * @returns {boolean} True if valid
 */
function validateApiKey(userId, apiKey) {
  if (!isValidUserId(userId) || typeof apiKey !== 'string' || apiKey.length < 16) {
    return false
  }

  const keys = loadApiKeys()
  return keys[userId] === apiKey
}

/**
 * Revoke API key for user
 * @param {string} userId - User ID
 */
function revokeApiKey(userId) {
  const keys = loadApiKeys()
  delete keys[userId]
  saveApiKeys(keys)
  console.log(`[Auth] Revoked API key for user: ${userId}`)
}

/**
 * Get all API keys
 * @returns {object} All API keys
 */
function getAllApiKeys() {
  return loadApiKeys()
}

/**
 * Express middleware to authenticate bridge requests
 * Expects headers: X-User-ID and X-API-Key
 */
function bridgeAuthMiddleware(req, res, next) {
  // Get credentials from headers
  const userId = req.headers['x-user-id']
  const apiKey = req.headers['x-api-key']
  
  // Check if auth is disabled (for development)
  if (isDevAuthBypassEnabled()) {
    req.userId = userId || 'dev-user'
    return next()
  }

  if (process.env.BRIDGE_REQUIRE_AUTH === 'false') {
    console.warn('[Auth] BRIDGE_REQUIRE_AUTH=false ignored in production')
  }
  
  // Validate credentials
  if (!userId || !apiKey) {
    console.warn('[Auth] Missing credentials in request')
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Missing X-User-ID or X-API-Key header'
    })
  }
  
  if (!validateApiKey(userId, apiKey)) {
    console.warn(`[Auth] Invalid API key for user: ${userId}`)
    return res.status(403).json({ 
      error: 'Invalid credentials',
      message: 'Invalid user ID or API key'
    })
  }
  
  // Attach user ID to request
  req.userId = userId
  next()
}

/**
 * Middleware to validate userId param matches authenticated user
 */
function validateUserParam(req, res, next) {
  const { userId } = req.params
  
  if (!isValidUserId(userId)) {
    return res.status(400).json({
      error: 'Invalid user ID',
      message: 'userId contains invalid characters'
    })
  }

  if (isDevAuthBypassEnabled()) {
    return next()
  }
  
  if (userId !== req.userId) {
    console.warn(`[Auth] User ${req.userId} attempted to access ${userId}'s resources`)
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'Cannot access another user\'s resources'
    })
  }
  
  next()
}

module.exports = {
  generateApiKey,
  getOrCreateApiKey,
  validateApiKey,
  revokeApiKey,
  getAllApiKeys,
  bridgeAuthMiddleware,
  validateUserParam
}
