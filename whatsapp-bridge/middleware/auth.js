const crypto = require('crypto')

const API_KEY_FILE = require('path').join(__dirname, '..', '.api_keys')
const fs = require('fs')

function generateApiKey() {
  return crypto.randomUUID()
}

function loadApiKeys() {
  try {
    if (fs.existsSync(API_KEY_FILE)) {
      const data = fs.readFileSync(API_KEY_FILE, 'utf8')
      return JSON.parse(data)
    }
  } catch (err) {
    console.error('[Auth] Error loading API keys:', err.message)
  }
  return {}
}

function saveApiKeys(keys) {
  try {
    fs.writeFileSync(API_KEY_FILE, JSON.stringify(keys, null, 2))
  } catch (err) {
    console.error('[Auth] Error saving API keys:', err.message)
  }
}

function getOrCreateApiKey(name) {
  const keys = loadApiKeys()
  if (keys[name]) {
    return keys[name]
  }
  const newKey = generateApiKey()
  keys[name] = newKey
  saveApiKeys(keys)
  console.log(`[Auth] Generated new API key for "${name}"`)
  return newKey
}

function getAllApiKeys() {
  return loadApiKeys()
}

function validateApiKey(key) {
  const keys = loadApiKeys()
  return Object.values(keys).includes(key)
}

function createFingerprint(req) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown'
  const ua = req.get('User-Agent') || 'unknown'
  const key = req.get('X-API-Key') || 'none'
  return crypto.createHash('sha256').update(`${ip}:${ua}:${key}`).digest('hex').substring(0, 16)
}

function authMiddleware(req, res, next) {
  if (process.env.BRIDGE_REQUIRE_AUTH !== 'true') {
    return next()
  }

  const apiKey = req.get('X-API-Key')
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'X-API-Key header is required' 
    })
  }

  if (!validateApiKey(apiKey)) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Invalid API key' 
    })
  }

  req.apiKeyFingerprint = createFingerprint(req)
  next()
}

module.exports = {
  authMiddleware,
  getOrCreateApiKey,
  getAllApiKeys,
  validateApiKey,
  createFingerprint,
}
