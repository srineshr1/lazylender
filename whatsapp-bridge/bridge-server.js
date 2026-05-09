const http = require('http')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const { ipKeyGenerator } = require('express-rate-limit')
const axios = require('axios')
require('dotenv').config()

const { bridgeAuthMiddleware, validateUserParam } = require('./middleware/bridgeAuth')
const sessionManager = require('./sessionManager')
const { processIncomingMessage } = require('./whatsappProcessor')

const PORT = process.env.PORT || process.env.BRIDGE_PORT || 3001

sessionManager.setMessageHandler((userId, message) => {
  processIncomingMessage(userId, message).catch((err) => {
    console.error(`[Processor] failed for ${userId}:`, err.message)
  })
})

const app = express()
app.set('trust proxy', 1)

const allowedOrigins = [
  process.env.CALENDAR_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'https://kairo.srinesh.in',
  'https://kairocalender.web.app',
  'https://kairocalender.firebaseapp.com',
]
if (process.env.ALLOWED_ORIGINS) {
  allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()))
}
const filteredOrigins = allowedOrigins.filter(Boolean)

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true)
    if (filteredOrigins.includes(origin)) return cb(null, true)
    if (/\.onrender\.com$/.test(origin) || /\.ngrok-free\.dev$/.test(origin) || /\.ngrok\.io$/.test(origin)) {
      return cb(null, true)
    }
    console.warn('[CORS] blocked origin:', origin)
    cb(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-API-Key'],
}

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors(corsOptions))
app.use(express.json({ limit: '1mb' }))

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: (req) => {
    const u = req.headers['x-user-id']
    return typeof u === 'string' && u.length > 0 ? `user:${u}` : ipKeyGenerator(req.ip)
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
})
app.use(limiter)

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeSessions: sessionManager.getActiveSessions().length,
    timestamp: new Date().toISOString(),
  })
})

// ---------------------------------------------------------------------------
// Authenticated routes
// ---------------------------------------------------------------------------
app.use(bridgeAuthMiddleware)

app.post('/users/:userId/connect', validateUserParam, async (req, res) => {
  const { userId } = req.params
  try {
    if (sessionManager.isActive(userId)) {
      return res.json({ success: true, message: 'Session already active' })
    }
    await sessionManager.startSession(userId)
    res.json({ success: true, message: 'Connection initiated' })
  } catch (err) {
    console.error('[Connect] error:', err.message)
    res.status(500).json({ error: 'Failed to start session' })
  }
})

app.post('/users/:userId/disconnect', validateUserParam, async (req, res) => {
  const { userId } = req.params
  try {
    await sessionManager.disconnectSession(userId)
    res.json({ success: true })
  } catch (err) {
    console.error('[Disconnect] error:', err.message)
    res.status(500).json({ error: 'Failed to disconnect' })
  }
})

app.post('/users/:userId/logout', validateUserParam, async (req, res) => {
  const { userId } = req.params
  try {
    await sessionManager.logoutSession(userId)
    res.json({ success: true })
  } catch (err) {
    console.error('[Logout] error:', err.message)
    res.status(500).json({ error: 'Failed to logout' })
  }
})

// ---------------------------------------------------------------------------
// Groq proxy (chat assistant)
// ---------------------------------------------------------------------------
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_API_KEY = process.env.GROQ_API_KEY

const groqLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.userId || ipKeyGenerator(req.ip),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests to AI service' },
})

app.post('/users/:userId/chat', validateUserParam, groqLimiter, async (req, res) => {
  if (!GROQ_API_KEY) return res.status(503).json({ error: 'AI service not configured' })

  const { model, messages, temperature, maxTokens } = req.body
  if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages array required' })

  try {
    const r = await axios.post(GROQ_API_URL, {
      model: model || 'llama-3.3-70b-versatile',
      messages,
      temperature: temperature ?? 0.1,
      max_tokens: maxTokens ?? 1000,
    }, {
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 30000,
    })
    res.json(r.data)
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json({
        error: 'Groq API error',
        message: err.response.data?.error?.message || 'AI service error',
      })
    }
    console.error('[Groq] error:', err.message)
    res.status(500).json({ error: 'AI service error', message: err.message })
  }
})

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
process.on('SIGINT', async () => { await sessionManager.shutdown(); process.exit(0) })
process.on('SIGTERM', async () => { await sessionManager.shutdown(); process.exit(0) })

const server = http.createServer(app)
server.listen(PORT, '0.0.0.0', () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  WhatsApp Bridge running on :${PORT}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  // Render free tier wipes the FS but the Supabase status row survives a
  // cold start. Clear stale CONNECTED rows so the UI prompts a fresh QR scan
  // instead of showing a green dot for a dead session.
  sessionManager.resetStaleStatus()
})
