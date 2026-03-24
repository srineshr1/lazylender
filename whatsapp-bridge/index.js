require('dotenv').config()
const { Client, LocalAuth, MessageTypes } = require('whatsapp-web.js')
const qrcode = require('qrcode-terminal')
const fs = require('fs')
const path = require('path')

const { WATCHED_GROUPS, KEYWORDS, MIN_KEYWORD_MATCHES } = require('./config')
const { analyzeText, analyzeImage, analyzePDF } = require('./analyzer')
const { pushEvents } = require('./calendarPush')

const MAX_RECONNECT_ATTEMPTS = 15
const RECONNECT_DELAY = 5000
const STATUS_FILE = path.join(__dirname, 'public', 'bridge-status.json')
const GROUPS_FILE = path.join(__dirname, 'public', 'groups.json')

let reconnectAttempts = 0
let qrData = null
let isReady = false
let client = null

function updateStatus(status) {
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2))
  } catch (err) {
    console.error('Failed to update status:', err.message)
  }
}

async function updateGroups(client) {
  try {
    const chats = await client.getChats()
    const groups = chats
      .filter(chat => chat.isGroup)
      .map(chat => ({
        id: chat.id._serialized,
        name: chat.name,
        participantCount: chat.participants?.length || 0
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
    
    fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2))
    log(`  📋 Fetched ${groups.length} groups`, 'info')
  } catch (err) {
    log(`  ⚠️  Failed to fetch groups: ${err.message}`, 'warning')
  }
}

function log(msg, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m'
  }
  const timestamp = new Date().toLocaleTimeString()
  console.log(`[\x1b[90m${timestamp}\x1b[0m] ${colors[type] || ''}${msg}${colors.reset}`)
}

log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info')
log('  📅 my.calendar WhatsApp Bridge', 'success')
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info')
log('  Session will be saved to .wwebjs_auth/', 'info')
log('  Scan QR once, never again!', 'success')
log(`  Watching groups: ${WATCHED_GROUPS.join(', ') || 'None configured'}`, 'warning')
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'info')

function createClient() {
  const whatsappClient = new Client({
    authStrategy: new LocalAuth({
      clientId: "mycalendar-bridge",
      dataPath: "./.wwebjs_auth"
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  })

  whatsappClient.on('qr', (qr) => {
    qrData = qr
    reconnectAttempts = 0
    updateStatus({ connected: false, qr: qr })
    log('\n  ╔═══════════════════════════════════════╗', 'warning')
    log('  ║         QR CODE READY                  ║', 'warning')
    log('  ╚═══════════════════════════════════════╝', 'warning')
    log('\n  🌐 Open http://localhost:3001 in browser', 'info')
    log('  📱 Scan with WhatsApp app\n', 'info')
    
    console.log(qr)
    qrcode.generate(qr, { small: true })
    console.log()
  })

  whatsappClient.on('authenticated', () => {
    qrData = null
    reconnectAttempts = 0
    updateStatus({ connected: false, qr: null, message: 'Authenticated, connecting...' })
    log('  ✅ Session authenticated and saved!', 'success')
  })

  whatsappClient.on('ready', async () => {
    isReady = true
    qrData = null
    reconnectAttempts = 0
    updateStatus({ connected: true, qr: null, message: 'Connected!' })
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'success')
    log('  ✅ WhatsApp connected!', 'success')
    log('  ✅ Session restored (no QR needed)', 'success')
    log('  📡 Listening for messages...', 'info')
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'success')
    
    // Fetch and save all groups
    await updateGroups(whatsappClient)
  })

  whatsappClient.on('auth_failure', (msg) => {
    updateStatus({ connected: false, qr: null, message: 'Auth failed' })
    log(`\n  ❌ Auth failed: ${msg}`, 'error')
    log('  Will retry...', 'warning')
  })

  whatsappClient.on('disconnected', (reason) => {
    isReady = false
    updateStatus({ connected: false, qr: null, message: 'Disconnected' })
    log(`\n  ⚠️  Disconnected: ${reason}`, 'warning')
    
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      log(`  ❌ Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached`, 'error')
      log('  Please restart the bridge manually', 'error')
      process.exit(1)
    }
    
    reconnectAttempts++
    log(`  🔄 Reconnecting in ${RECONNECT_DELAY/1000}s... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`, 'warning')
    
    setTimeout(() => {
      log('  🔄 Attempting to reconnect...', 'info')
      whatsappClient.initialize().catch(err => {
        log(`  ❌ Reconnection error: ${err.message}`, 'error')
      })
    }, RECONNECT_DELAY)
  })

  whatsappClient.on('message', async (msg) => {
    try {
      const chat = await msg.getChat()

      if (!chat.isGroup) return

      const groupName = chat.name || ''

      if (!isWatchedGroup(groupName)) return

      const timestamp = new Date().toLocaleTimeString()
      log(`\n[${timestamp}] 📨 "${groupName}"`, 'info')
      log(`  Type: ${msg.type}`, 'info')

      let events = []

      if (msg.type === 'chat' || msg.type === MessageTypes.TEXT) {
        const text = msg.body || ''
        log(`  Text: "${text.slice(0, 60)}${text.length > 60 ? '...' : ''}"`, 'info')

        if (!isRelevantMessage(text)) {
          log('  ⏭️  Not relevant, skipping', 'warning')
          return
        }

        log('  🔍 Relevant! Sending to Ollama...', 'info')
        events = await analyzeText(text, groupName)
      }

      else if (msg.type === MessageTypes.IMAGE || msg.type === 'image') {
        log('  🖼️  Image received, downloading...', 'info')
        const media = await msg.downloadMedia()
        if (!media) { log('  ❌ Could not download image', 'error'); return }

        const base64 = media.data
        const mimeType = media.mimetype || 'image/jpeg'
        log(`  📊 Analyzing image (${mimeType})...`, 'info')
        events = await analyzeImage(base64, mimeType, groupName)
      }

      else if (msg.type === MessageTypes.DOCUMENT || msg.type === 'document') {
        const media = await msg.downloadMedia()
        if (!media) { log('  ❌ Could not download document', 'error'); return }

        if (media.mimetype?.includes('pdf') || media.filename?.endsWith('.pdf')) {
          log('  📄 PDF received, extracting...', 'info')
          const buffer = Buffer.from(media.data, 'base64')
          events = await analyzePDF(buffer, groupName)
        } else {
          log(`  ⏭️  Document type not supported: ${media.mimetype}`, 'warning')
          return
        }
      }

      else {
        log(`  ⏭️  Message type not handled: ${msg.type}`, 'warning')
        return
      }

      if (events.length > 0) {
        log(`  ✅ Extracted ${events.length} event(s)!`, 'success')
        await pushEvents(events)
      } else {
        log('  ℹ️  No events extracted', 'info')
      }

    } catch (err) {
      log(`  ❌ Error: ${err.message}`, 'error')
    }
  })

  return whatsappClient
}

function isWatchedGroup(chatName) {
  if (!chatName) return false
  const name = chatName.toLowerCase()
  return WATCHED_GROUPS.some(g => name.includes(g.toLowerCase()))
}

function isRelevantMessage(text) {
  if (!text) return false
  const lower = text.toLowerCase()
  const matches = KEYWORDS.filter(k => lower.includes(k.toLowerCase()))
  return matches.length >= MIN_KEYWORD_MATCHES
}

client = createClient()

client.initialize().catch(err => {
  log(`\n  ❌ Failed to start WhatsApp client: ${err.message}`, 'error')
  log('  Please check your internet connection and try again.', 'error')
  process.exit(1)
})

process.on('SIGINT', async () => {
  log('\n\n  Shutting down...', 'warning')
  if (client) {
    await client.destroy()
  }
  process.exit(0)
})

process.on('unhandledRejection', (reason, promise) => {
  log(`  ⚠️  Unhandled rejection: ${reason}`, 'warning')
})
