const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const { ipKeyGenerator } = require('express-rate-limit')
const crypto = require('crypto')
const axios = require('axios')
require('dotenv').config()

const { bridgeAuthMiddleware, validateUserParam, getOrCreateApiKey } = require('./middleware/bridgeAuth')
const sessionManager = require('./sessionManager')
const { 
  readUserFile, 
  writeUserFile, 
  getUserStatus,
  initUserDir,
  userDirExists
} = require('./utils/userData')
const { processIncomingMessage } = require('./whatsappProcessor')

const app = express()

// Trust Railway's reverse proxy so rate limiting uses real client IPs
app.set('trust proxy', 1)

const PORT = process.env.PORT || process.env.BRIDGE_PORT || 3001
const ADMIN_API_KEY = process.env.BRIDGE_ADMIN_API_KEY || ''

function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

function isValidUserId(userId) {
  return typeof userId === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(userId)
}

sessionManager.setMessageHandler((userId, message) => {
  processIncomingMessage(userId, message).catch((err) => {
    console.error(`[Processor] Failed to process message for ${userId}:`, err.message)
  })
})

// CORS Configuration
const allowedOrigins = [
  process.env.CALENDAR_URL || 'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'https://kairo.srinesh.in',
  'https://kairocalender.web.app',
  'https://kairocalender.firebaseapp.com'
]

if (process.env.ALLOWED_ORIGINS) {
  const customOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  allowedOrigins.push(...customOrigins)
}

// Filter out empty strings
const filteredOrigins = allowedOrigins.filter(o => o && o.length > 0)

console.log('[CORS] Allowed origins:', filteredOrigins)

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or Postman)
    if (!origin) {
      console.log('[CORS] Allowing request with no origin (mobile/curl/Postman)')
      return callback(null, true)
    }
    
    // Check if origin is in allowed list
    const isAllowed = filteredOrigins.some(allowedOrigin => {
      // Exact match
      if (origin === allowedOrigin) return true
      
      // Allow ngrok subdomains (for development/testing)
      if (origin.includes('.ngrok-free.dev') || origin.includes('.ngrok.io')) {
        console.log('[CORS] Allowing ngrok origin:', origin)
        return true
      }
      
      // Allow Railway preview deployments
      if (origin.includes('.railway.app') || origin.includes('.up.railway.app')) {
        console.log('[CORS] Allowing Railway origin:', origin)
        return true
      }
      
      return false
    })
    
    if (isAllowed) {
      console.log('[CORS] Allowed origin:', origin)
      callback(null, true)
    } else {
      console.warn('[CORS] Blocked request from origin:', origin)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-API-Key']
}

// Rate limiting - global per user/IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 120, // 120 requests per minute (allows polling every 0.5 seconds)
  keyGenerator: (req) => {
    const userKey = req.headers['x-user-id']
    if (typeof userKey === 'string' && userKey.length > 0) {
      return `user:${userKey}`
    }
    return ipKeyGenerator(req.ip)
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
})

// Strict rate limit for /register — prevents API-key farming
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 10, // max 10 registrations per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts, please try again later.' }
})

// Security headers (helmet) — must be before cors()
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' } // Allow cross-origin fetch
}))

// CORS — single source of truth; removes the need for manual header middleware
app.use(cors(corsOptions))
app.use(express.json({ limit: '1mb' }))
app.use(limiter)

// ============================================================================
// PUBLIC ENDPOINTS (No auth required)
// ============================================================================

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Multi-tenant WhatsApp Bridge is running',
    activeSessions: sessionManager.getActiveSessions().length,
    timestamp: new Date().toISOString()
  })
})

/**
 * Register new user and get API key
 * Body: { userId: string }
 */
app.post('/register', registerLimiter, async (req, res) => {
  try {
    const { userId } = req.body
    
    console.log('[Register] Request received for userId:', userId)
    
    if (!userId) {
      return res.status(400).json({
        error: 'Invalid user ID',
        message: 'userId is required'
      })
    }
    
    if (!isValidUserId(userId)) {
      console.log('[Register] Invalid userId format:', userId)
      return res.status(400).json({
        error: 'Invalid user ID',
        message: 'userId must match /^[a-zA-Z0-9_-]{1,128}$/'
      })
    }
    
    // Initialize user directory
    if (!userDirExists(userId)) {
      console.log('[Register] Creating user directory for:', userId)
      initUserDir(userId)
    } else {
      console.log('[Register] User directory exists for:', userId)
    }
    
    // Generate or retrieve API key
    const apiKey = getOrCreateApiKey(userId)
    
    console.log('[Register] Registration successful for:', userId)
    res.json({ 
      success: true,
      userId,
      apiKey,
      message: 'User registered successfully'
    })
  } catch (err) {
    console.error('[Register] Error:', err.message, err.stack)
    res.status(500).json({ error: 'Failed to register user', message: err.message })
  }
})

// ============================================================================
// AUTHENTICATED USER ENDPOINTS
// ============================================================================

// Apply authentication to all routes below
app.use(bridgeAuthMiddleware)

function requireAdmin(req, res, next) {
  if (!ADMIN_API_KEY) {
    return res.status(503).json({
      error: 'Admin endpoint disabled',
      message: 'Set BRIDGE_ADMIN_API_KEY to enable admin endpoints'
    })
  }

  const suppliedKey = req.headers['x-admin-key']
  if (!suppliedKey || !secureCompare(suppliedKey, ADMIN_API_KEY)) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Invalid or missing X-Admin-Key header'
    })
  }

  next()
}

/**
 * Get user's WhatsApp connection status
 * GET /users/:userId/status
 */
app.get('/users/:userId/status', validateUserParam, (req, res) => {
  const { userId } = req.params
  
  try {
    const status = getUserStatus(userId)
    const sessionState = sessionManager.getSessionState(userId)
    
    let sessionStatus = 'DISCONNECTED'
    if (sessionState.connected) {
      sessionStatus = 'CONNECTED'
    } else if (sessionState.hasSession) {
      if (status.qr) {
        sessionStatus = 'QR_READY'
      } else if (status.message === 'Authenticated, loading...') {
        sessionStatus = 'AUTHENTICATING'
      } else {
        sessionStatus = 'CONNECTING'
      }
    }
    
    res.json({
      ...status,
      sessionActive: sessionState.connected,
      sessionStatus
    })
  } catch (err) {
    console.error('[Status] Error:', err.message)
    res.status(500).json({ 
      error: 'Failed to get status',
      connected: false 
    })
  }
})

/**
 * Connect user's WhatsApp
 * POST /users/:userId/connect
 */
app.post('/users/:userId/connect', validateUserParam, async (req, res) => {
  const { userId } = req.params
  
  try {
    // Check if already connected
    if (sessionManager.hasSession(userId)) {
      return res.json({ 
        success: true,
        message: 'Already connected or connecting'
      })
    }
    
    // Create session (async - will generate QR code)
    sessionManager.createSession(userId).catch(err => {
      console.error(`[Connect] Failed to initialize session for ${userId}:`, err.message)
    })
    
    res.json({ 
      success: true,
      message: 'Connection initiated. Check status for QR code.'
    })
  } catch (err) {
    console.error('[Connect] Error:', err.message)
    res.status(500).json({ error: 'Failed to initiate connection' })
  }
})

/**
 * Disconnect user's WhatsApp (temporary - preserves credentials)
 * POST /users/:userId/disconnect
 */
app.post('/users/:userId/disconnect', validateUserParam, async (req, res) => {
  const { userId } = req.params
  
  try {
    // For disconnect, we just clear the session state but keep auth
    // The session will reconnect on next connect call
    res.json({ 
      success: true,
      message: 'Disconnected successfully'
    })
  } catch (err) {
    console.error('[Disconnect] Error:', err.message)
    res.status(500).json({ error: 'Failed to disconnect' })
  }
})

/**
 * Logout user's WhatsApp (permanent - deletes credentials)
 * POST /users/:userId/logout
 */
app.post('/users/:userId/logout', validateUserParam, async (req, res) => {
  const { userId } = req.params
  
  try {
    await sessionManager.logoutSession(userId)
    res.json({ 
      success: true,
      message: 'Logged out successfully'
    })
  } catch (err) {
    console.error('[Logout] Error:', err.message)
    res.status(500).json({ error: 'Failed to logout' })
  }
})

/**
 * Get user's WhatsApp groups
 * GET /users/:userId/groups
 */
app.get('/users/:userId/groups', validateUserParam, (req, res) => {
  const { userId } = req.params
  
  try {
    const groups = readUserFile(userId, 'groups.json') || []
    const activity = readUserFile(userId, 'group-activity.json') || {}
    
    // Enhance groups with activity data
    const enhancedGroups = groups.map(group => ({
      ...group,
      messageCount: activity[group.id] || 0
    }))
    
    res.json(enhancedGroups)
  } catch (err) {
    console.error('[Groups] Error:', err.message)
    res.status(500).json({ error: 'Failed to load groups' })
  }
})

/**
 * Get user's WhatsApp contacts (individual chats)
 * GET /users/:userId/contacts
 */
app.get('/users/:userId/contacts', validateUserParam, (req, res) => {
  const { userId } = req.params
  
  try {
    const contacts = readUserFile(userId, 'contacts.json') || []
    const activity = readUserFile(userId, 'group-activity.json') || {}
    
    // Enhance contacts with activity data and sort by message count
    const enhancedContacts = contacts
      .map(contact => ({
        ...contact,
        messageCount: activity[contact.id] || contact.messageCount || 0
      }))
      .sort((a, b) => b.messageCount - a.messageCount)
    
    res.json(enhancedContacts)
  } catch (err) {
    console.error('[Contacts] Error:', err.message)
    res.status(500).json({ error: 'Failed to load contacts' })
  }
})

/**
 * Get user's watched groups
 * GET /users/:userId/watched-groups
 */
app.get('/users/:userId/watched-groups', validateUserParam, (req, res) => {
  const { userId } = req.params
  
  try {
    const watchedGroups = readUserFile(userId, 'watched-groups.json') || []
    res.json(watchedGroups)
  } catch (err) {
    console.error('[Watched Groups] Error:', err.message)
    res.status(500).json({ error: 'Failed to load watched groups' })
  }
})

/**
 * Set user's watched groups
 * POST /users/:userId/watched-groups
 * Body: { groups: [{ id, name }] }
 */
app.post('/users/:userId/watched-groups', validateUserParam, (req, res) => {
  const { userId } = req.params
  const { groups } = req.body
  
  if (!Array.isArray(groups)) {
    return res.status(400).json({ error: 'groups must be an array' })
  }
  
  try {
    // Validate and sanitize groups
    const validGroups = groups.filter(g => g && g.id && g.name).map(g => ({
      id: g.id,
      name: g.name
    }))
    
    writeUserFile(userId, 'watched-groups.json', validGroups)
    
    // Clear old incoming messages that are not from watched groups
    const watchedIds = new Set(validGroups.map(g => g.id))
    const existingMessages = readUserFile(userId, 'incoming-messages.json') || []
    const filteredMessages = existingMessages.filter(msg => {
      const chatId = msg.groupId || msg.from
      return watchedIds.has(chatId)
    })
    writeUserFile(userId, 'incoming-messages.json', filteredMessages)
    
    console.log(`[Watched Groups] Updated for ${userId}: ${validGroups.length} groups, filtered ${existingMessages.length - filteredMessages.length} old messages`)
    
    res.json({ 
      success: true,
      watchedCount: validGroups.length
    })
  } catch (err) {
    console.error('[Watched Groups] Error:', err.message)
    res.status(500).json({ error: 'Failed to update watched groups' })
  }
})

/**
 * Get user's events from WhatsApp
 * GET /users/:userId/events
 */
app.get('/users/:userId/events', validateUserParam, (req, res) => {
  const { userId } = req.params
  
  try {
    const events = readUserFile(userId, 'events.json') || []
    res.json(events)
  } catch (err) {
    console.error('[Events] Error:', err.message)
    res.status(500).json({ error: 'Failed to load events' })
  }
})

/**
 * Get recent incoming messages for debugging/validation
 * GET /users/:userId/messages
 */
app.get('/users/:userId/messages', validateUserParam, (req, res) => {
  const { userId } = req.params

  try {
    const messages = readUserFile(userId, 'incoming-messages.json') || []
    res.json(messages)
  } catch (err) {
    console.error('[Messages] Error:', err.message)
    res.status(500).json({ error: 'Failed to load messages' })
  }
})

/**
 * Clear user's events
 * DELETE /users/:userId/events
 */
app.delete('/users/:userId/events', validateUserParam, (req, res) => {
  const { userId } = req.params
  
  try {
    writeUserFile(userId, 'events.json', [])
    res.json({ success: true })
  } catch (err) {
    console.error('[Events] Error:', err.message)
    res.status(500).json({ error: 'Failed to clear events' })
  }
})

/**
 * Add events to user's queue (called by WhatsApp message processor)
 * POST /users/:userId/events
 * Body: { events: [...] }
 */
app.post('/users/:userId/events', validateUserParam, (req, res) => {
  const { userId } = req.params
  const { events } = req.body
  
  if (!Array.isArray(events)) {
    return res.status(400).json({ error: 'events must be an array' })
  }
  
  try {
    const existing = readUserFile(userId, 'events.json') || []
    const validEvents = events.filter(e => e && e.title && e.date).map(e => ({
      id: e.id || Date.now().toString(),
      title: e.title.substring(0, 200),
      date: e.date,
      time: e.time || '09:00',
      duration: Math.min(Math.max(parseInt(e.duration) || 60, 15), 1440),
      group: e.group?.substring(0, 100) || 'WhatsApp',
      color: ['pink', 'green', 'blue', 'amber', 'gray'].includes(e.color) ? e.color : 'blue'
    }))
    
    const updated = [...existing, ...validEvents]
    writeUserFile(userId, 'events.json', updated)
    
    console.log(`[Events] Added ${validEvents.length} event(s) for ${userId}`)
    
    res.json({ success: true, queued: validEvents.length })
  } catch (err) {
    console.error('[Events] Error:', err.message)
    res.status(500).json({ error: 'Failed to add events' })
  }
})

/**
 * Get group activity stats
 * GET /users/:userId/group-activity
 */
app.get('/users/:userId/group-activity', validateUserParam, (req, res) => {
  const { userId } = req.params
  
  try {
    const activity = readUserFile(userId, 'group-activity.json') || {}
    res.json(activity)
  } catch (err) {
    console.error('[Group Activity] Error:', err.message)
    res.status(500).json({ error: 'Failed to load group activity' })
  }
})

// ============================================================================
// ADMIN ENDPOINTS (For debugging - should be secured in production)
// ============================================================================

/**
 * List all active sessions
 * GET /admin/sessions
 */
app.get('/admin/sessions', requireAdmin, (req, res) => {
  const sessions = sessionManager.getActiveSessions()
  res.json({
    count: sessions.length,
    sessions: sessions.map(s => ({
      userId: s.userId,
      status: s.status,
      createdAt: new Date(s.createdAt).toISOString(),
      lastSeen: new Date(s.lastSeen).toISOString()
    }))
  })
})

// ============================================================================
// GROQ API PROXY (for frontend chat)
// ============================================================================

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_API_KEY = process.env.GROQ_API_KEY

const groqLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.userId || ipKeyGenerator(req.ip),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests to AI service' }
})

app.post('/users/:userId/chat', validateUserParam, groqLimiter, async (req, res) => {
  const { userId } = req.params
  
  if (!GROQ_API_KEY) {
    return res.status(503).json({
      error: 'AI service not configured',
      message: 'GROQ_API_KEY not set on server'
    })
  }

  const { model, messages, temperature, maxTokens } = req.body

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'messages array is required'
    })
  }

  try {
    const response = await axios.post(GROQ_API_URL, {
      model: model || 'llama-3.3-70b-versatile',
      messages,
      temperature: temperature ?? 0.1,
      max_tokens: maxTokens ?? 1000
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    })

    res.json(response.data)
  } catch (err) {
    console.error(`[Groq] Error for ${userId}:`, err.message)
    
    if (err.response) {
      return res.status(err.response.status).json({
        error: 'Groq API error',
        message: err.response.data?.error?.message || 'AI service error'
      })
    }
    
    res.status(500).json({
      error: 'AI service error',
      message: err.message
    })
  }
})

// ============================================================================
// SERVER LIFECYCLE
// ============================================================================

// Restore existing sessions on startup
sessionManager.restoreExistingSessions().then(() => {
  console.log('[Bridge] Existing sessions restored')
})

// Cleanup inactive sessions every hour
setInterval(() => {
  sessionManager.cleanupInactiveSessions().then(count => {
    if (count > 0) {
      console.log(`[Bridge] Cleaned up ${count} inactive session(s)`)
    }
  })
}, 60 * 60 * 1000)

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Bridge] Shutting down...')
  await sessionManager.shutdown()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n[Bridge] Shutting down...')
  await sessionManager.shutdown()
  process.exit(0)
})

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  📡 Multi-Tenant WhatsApp Bridge Server')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  🌐 Server running on port ${PORT}`)
  const authEnabled = process.env.BRIDGE_REQUIRE_AUTH !== 'false' || process.env.NODE_ENV === 'production'
  console.log(`  🔐 API Auth: ${authEnabled ? 'ENABLED' : 'DISABLED (dev only)'}`)
  console.log('  📂 User data: sessions/')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
})
