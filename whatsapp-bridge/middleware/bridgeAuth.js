const crypto = require('crypto')
const { getSupabase } = require('../supabaseClient')

const CACHE_TTL_MS = 5 * 60 * 1000
const cache = new Map()

function isValidUserId(userId) {
  return typeof userId === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(userId)
}

function isDevAuthBypassEnabled() {
  return process.env.BRIDGE_REQUIRE_AUTH === 'false' && process.env.NODE_ENV === 'development'
}

async function lookupApiKey(userId) {
  const cached = cache.get(userId)
  if (cached && cached.expiresAt > Date.now()) return cached.apiKey

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('bridge_api_keys')
    .select('api_key, is_active')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[Auth] Supabase lookup error:', error.message)
    return null
  }
  if (!data || !data.is_active) return null

  cache.set(userId, { apiKey: data.api_key, expiresAt: Date.now() + CACHE_TTL_MS })
  return data.api_key
}

function invalidateCache(userId) {
  if (userId) cache.delete(userId)
  else cache.clear()
}

function timingSafeEqualStr(a, b) {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

async function validateCredentials(userId, apiKey) {
  if (!isValidUserId(userId) || typeof apiKey !== 'string' || apiKey.length < 16) return false
  const stored = await lookupApiKey(userId)
  if (!stored) return false
  if (timingSafeEqualStr(stored, apiKey)) return true
  invalidateCache(userId)
  const fresh = await lookupApiKey(userId)
  return !!fresh && timingSafeEqualStr(fresh, apiKey)
}

async function bridgeAuthMiddleware(req, res, next) {
  const userId = req.headers['x-user-id']
  const apiKey = req.headers['x-api-key']

  if (isDevAuthBypassEnabled()) {
    req.userId = userId || 'dev-user'
    return next()
  }

  if (!userId || !apiKey) {
    return res.status(401).json({ error: 'Authentication required', message: 'Missing X-User-ID or X-API-Key header' })
  }

  try {
    const ok = await validateCredentials(userId, apiKey)
    if (!ok) {
      return res.status(403).json({ error: 'Invalid credentials', message: 'Invalid user ID or API key' })
    }
    req.userId = userId
    next()
  } catch (err) {
    console.error('[Auth] Middleware error:', err.message)
    res.status(500).json({ error: 'Auth check failed' })
  }
}

function validateUserParam(req, res, next) {
  const { userId } = req.params
  if (!isValidUserId(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' })
  }
  if (isDevAuthBypassEnabled()) return next()
  if (userId !== req.userId) {
    return res.status(403).json({ error: 'Access denied' })
  }
  next()
}

module.exports = {
  bridgeAuthMiddleware,
  validateUserParam,
  isValidUserId,
  invalidateCache,
}
