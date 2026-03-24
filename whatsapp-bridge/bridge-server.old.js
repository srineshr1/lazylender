const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const { authMiddleware, getOrCreateApiKey, getAllApiKeys } = require('./middleware/auth')

const app = express()
const PORT = process.env.BRIDGE_PORT || 3001

const API_KEYS_PER_HOUR = 50

const QUEUE_FILE = path.join(__dirname, 'public', 'events-queue.json')
const STATUS_FILE = path.join(__dirname, 'public', 'bridge-status.json')
const GROUPS_FILE = path.join(__dirname, 'public', 'groups.json')

if (!fs.existsSync(path.join(__dirname, 'public'))) {
  fs.mkdirSync(path.join(__dirname, 'public'))
}
if (!fs.existsSync(QUEUE_FILE)) {
  fs.writeFileSync(QUEUE_FILE, '[]')
}
if (!fs.existsSync(STATUS_FILE)) {
  fs.writeFileSync(STATUS_FILE, JSON.stringify({ connected: false, qr: null }))
}
if (!fs.existsSync(GROUPS_FILE)) {
  fs.writeFileSync(GROUPS_FILE, '[]')
}

// CORS Configuration
const allowedOrigins = [
  process.env.CALENDAR_URL || 'http://localhost:5173',
  'http://localhost:5174', // Alternative dev port
  'http://localhost:5175', // Alternative dev port
]

// Add custom allowed origins from .env if specified
if (process.env.ALLOWED_ORIGINS) {
  const customOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  allowedOrigins.push(...customOrigins)
}

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      console.warn('[CORS] Blocked request with missing Origin header')
      return callback(new Error('Origin header required'))
    }
    
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

// Rate Limiting Configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (process.env.BRIDGE_REQUIRE_AUTH === 'true' && req.apiKeyFingerprint) {
      return req.apiKeyFingerprint
    }
    return req.ip
  },
})

const eventsPostLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { error: 'Too many events posted, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (process.env.BRIDGE_REQUIRE_AUTH === 'true' && req.apiKeyFingerprint) {
      return req.apiKeyFingerprint
    }
    return req.ip
  },
})

const apiKeyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: API_KEYS_PER_HOUR,
  message: { error: 'API key rate limit exceeded. Maximum 50 requests per hour.' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use(cors(corsOptions))
app.use(express.json({ limit: '10mb' }))
app.use(limiter)

app.get('/qr-data', authMiddleware, (req, res) => {
  try {
    const status = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'))
    res.type('text/plain').send(status.qr || 'waiting')
  } catch {
    res.type('text/plain').send('waiting')
  }
})

app.get('/status', authMiddleware, (req, res) => {
  try {
    const status = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'))
    res.json(status)
  } catch {
    res.json({ connected: false })
  }
})

app.get('/groups', authMiddleware, (req, res) => {
  try {
    const groups = JSON.parse(fs.readFileSync(GROUPS_FILE, 'utf8') || '[]')
    res.json(groups)
  } catch {
    res.json([])
  }
})

app.post('/events', authMiddleware, eventsPostLimiter, (req, res) => {
  try {
    const { events } = req.body
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'events array required' })
    }

    // Validate and sanitize each event
    const validEvents = events.filter(e => {
      if (!e || typeof e !== 'object') return false
      if (!e.title || typeof e.title !== 'string' || e.title.length > 200) return false
      if (!e.date || typeof e.date !== 'string') return false
      return true
    }).map(e => ({
      // Sanitize by only keeping allowed fields
      id: e.id || Date.now().toString(),
      title: e.title.substring(0, 200), // Truncate long titles
      date: e.date,
      time: e.time || '09:00',
      duration: Math.min(Math.max(parseInt(e.duration) || 60, 15), 1440), // 15min to 24h
      group: e.group?.substring(0, 100) || 'WhatsApp',
      color: ['pink', 'green', 'blue', 'amber', 'gray'].includes(e.color) ? e.color : 'blue'
    }))

    if (validEvents.length === 0) {
      return res.status(400).json({ error: 'No valid events provided' })
    }

    const existing = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8') || '[]')
    const updated = [...existing, ...validEvents]
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(updated, null, 2))

    console.log(`[${new Date().toLocaleTimeString()}] ✅ Queued ${validEvents.length} event(s)`)
    validEvents.forEach(e => console.log(`  → ${e.title} on ${e.date}`))

    res.json({ success: true, queued: validEvents.length })
  } catch (err) {
    console.error('Error queuing events:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/events', authMiddleware, (req, res) => {
  try {
    const events = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8') || '[]')
    res.json(events)
  } catch {
    res.json([])
  }
})

app.delete('/events', authMiddleware, (req, res) => {
  fs.writeFileSync(QUEUE_FILE, '[]')
  res.json({ success: true })
})

app.get('/api-keys', (req, res) => {
  if (process.env.BRIDGE_REQUIRE_AUTH !== 'true') {
    return res.json({ message: 'API key authentication is not enabled. Set BRIDGE_REQUIRE_AUTH=true in .env' })
  }
  const keys = getAllApiKeys()
  const keyNames = Object.keys(keys).map(name => ({ name, key: keys[name].substring(0, 8) + '...' }))
  res.json({ keys: keyNames })
})

app.post('/api-keys/generate', apiKeyLimiter, (req, res) => {
  if (process.env.BRIDGE_REQUIRE_AUTH !== 'true') {
    return res.status(403).json({ error: 'API key authentication is not enabled' })
  }
  const { name } = req.body
  if (!name || typeof name !== 'string' || name.length < 2) {
    return res.status(400).json({ error: 'Name must be at least 2 characters' })
  }
  const key = getOrCreateApiKey(name.substring(0, 50))
  res.json({ name, key })
})

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>WhatsApp Bridge QR</title>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    .container {
      text-align: center;
      padding: 40px;
      background: rgba(255,255,255,0.1);
      border-radius: 20px;
      backdrop-filter: blur(10px);
      max-width: 500px;
      width: 90%;
    }
    h1 { font-size: 28px; margin-bottom: 10px; color: #25D366; }
    .subtitle { font-size: 14px; color: #aaa; margin-bottom: 30px; }
    .qr-container {
      background: white;
      padding: 20px;
      border-radius: 15px;
      margin-bottom: 20px;
    }
    .qr-container pre {
      font-size: 6px;
      line-height: 1;
      color: #000;
      overflow: hidden;
      max-height: 350px;
    }
    .instructions {
      font-size: 14px;
      color: #ccc;
      margin-top: 20px;
      line-height: 2;
      text-align: left;
    }
    .instructions strong { color: #25D366; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .waiting { animation: pulse 2s infinite; }
    .countdown { font-size: 12px; color: #ff6b6b; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>WhatsApp Bridge</h1>
    <p class="subtitle" id="status">Waiting for WhatsApp bridge...</p>
    <div class="qr-container" id="qrContainer">
      <pre id="qrCode">Waiting for WhatsApp bridge to start...</pre>
      <p class="countdown" id="countdown"></p>
    </div>
    <div class="instructions">
      <p><strong>1.</strong> Start the WhatsApp bridge (node index.js)</p>
      <p><strong>2.</strong> Scan QR code with WhatsApp app</p>
      <p><strong>3.</strong> Bridge auto-connects on restart!</p>
    </div>
  </div>

  <script>
    const statusEl = document.getElementById('status')
    const qrEl = document.getElementById('qrCode')
    const countdownEl = document.getElementById('countdown')
    let countdown = 60
    
    async function check() {
      try {
        const res = await fetch('/status')
        const status = await res.json()
        
        if (status.connected) {
          document.getElementById('qrContainer').style.display = 'none'
          statusEl.innerHTML = '<span style="font-size:40px">✅</span><br>WhatsApp Connected!'
          statusEl.style.color = '#25D366'
        } else if (status.qr && status.qr !== 'waiting') {
          qrEl.textContent = status.qr
          statusEl.textContent = '✅ Scan this QR with WhatsApp!'
          statusEl.className = ''
          statusEl.style.color = '#aaa'
          countdown = 60
        } else {
          qrEl.textContent = 'Waiting for QR...'
          statusEl.textContent = 'Starting WhatsApp bridge...'
          statusEl.className = 'waiting'
          statusEl.style.color = '#aaa'
        }
      } catch (e) {
        qrEl.textContent = 'Error connecting...'
      }
    }
    
    setInterval(() => {
      countdown--
      countdownEl.textContent = countdown > 0 ? 'Expires in ' + countdown + 's' : ''
    }, 1000)
    
    check()
    setInterval(check, 2000)
  </script>
</body>
</html>
  `)
})

app.listen(PORT, () => {
  const authEnabled = process.env.BRIDGE_REQUIRE_AUTH === 'true'
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  📡 WhatsApp Bridge Server')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  🌐 Open http://localhost:${PORT} to scan QR`)
  console.log('  📁 Events queue: public/events-queue.json')
  console.log(`  🔐 API Auth: ${authEnabled ? 'ENABLED' : 'DISABLED'}`)
  if (authEnabled) {
    console.log('  📝 Set BRIDGE_REQUIRE_AUTH=false to disable')
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
})
