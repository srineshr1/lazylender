const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
require('dotenv').config()

const { bridgeAuthMiddleware, validateUserParam, getOrCreateApiKey } = require('./middleware/bridgeAuth')
const sessionManager = require('./sessions/manager')
const { 
  readUserFile, 
  writeUserFile, 
  getUserStatus,
  initUserDir,
  userDirExists
} = require('./utils/userData')

const app = express()
const PORT = process.env.BRIDGE_PORT || 3001

// CORS Configuration
const allowedOrigins = [
  process.env.CALENDAR_URL || 'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
]

if (process.env.ALLOWED_ORIGINS) {
  const customOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  allowedOrigins.push(...customOrigins)
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}

// Rate limiting - global per IP (simple setup)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 120, // 120 requests per minute (allows polling every 0.5 seconds)
  message: { error: 'Too many requests, please try again later.' }
})

app.use(cors(corsOptions))
app.use(express.json({ limit: '10mb' }))
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
    activeSessions: sessionManager.getAllSessions().length,
    timestamp: new Date().toISOString()
  })
})

/**
 * Register new user and get API key
 * Body: { userId: string }
 */
app.post('/register', async (req, res) => {
  try {
    const { userId } = req.body
    
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId is required' })
    }
    
    // Initialize user directory
    if (!userDirExists(userId)) {
      initUserDir(userId)
    }
    
    // Generate or retrieve API key
    const apiKey = getOrCreateApiKey(userId)
    
    res.json({ 
      success: true,
      userId,
      apiKey,
      message: 'User registered successfully'
    })
  } catch (err) {
    console.error('[Register] Error:', err.message)
    res.status(500).json({ error: 'Failed to register user' })
  }
})

// ============================================================================
// AUTHENTICATED USER ENDPOINTS
// ============================================================================

// Apply authentication to all routes below
app.use(bridgeAuthMiddleware)

/**
 * Get user's WhatsApp connection status
 * GET /users/:userId/status
 */
app.get('/users/:userId/status', validateUserParam, (req, res) => {
  const { userId } = req.params
  
  try {
    const status = getUserStatus(userId)
    const session = sessionManager.getSession(userId)
    
    res.json({
      ...status,
      sessionActive: !!session,
      sessionStatus: session?.status || 'DISCONNECTED',
      qrAttempts: session?.qrAttempts || 0,
      maxQrAttempts: session?.maxQrAttempts || 3
    })
  } catch (err) {
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
 * Disconnect user's WhatsApp
 * POST /users/:userId/disconnect
 */
app.post('/users/:userId/disconnect', validateUserParam, async (req, res) => {
  const { userId } = req.params
  
  try {
    await sessionManager.destroySession(userId, false)
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
    res.json([])
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
    res.json([])
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
    
    console.log(`[Watched Groups] Updated for ${userId}: ${validGroups.length} groups`)
    
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
    res.json([])
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
    res.json({})
  }
})

// ============================================================================
// ADMIN ENDPOINTS (For debugging - should be secured in production)
// ============================================================================

/**
 * List all active sessions
 * GET /admin/sessions
 */
app.get('/admin/sessions', (req, res) => {
  const sessions = sessionManager.getAllSessions()
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
app.listen(PORT, () => {
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  📡 Multi-Tenant WhatsApp Bridge Server')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  🌐 Server running on port ${PORT}`)
  console.log(`  🔐 API Auth: ${process.env.BRIDGE_REQUIRE_AUTH !== 'false' ? 'ENABLED' : 'DISABLED'}`)
  console.log('  📂 User data: sessions/')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
})
