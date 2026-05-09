const { Client, LocalAuth } = require('whatsapp-web.js')
const fs = require('fs')
const path = require('path')

const { getSupabase } = require('./supabaseClient')

const SESSIONS_DIR = path.join(__dirname, 'sessions')
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true })

const sessions = new Map()
let messageHandler = null

function setMessageHandler(handler) {
  messageHandler = handler
}

function sanitizeUserId(userId) {
  return userId.replace(/[^a-zA-Z0-9_-]/g, '')
}

function userAuthDir(userId) {
  return path.join(SESSIONS_DIR, `user_${sanitizeUserId(userId)}`)
}

async function writeStatus(userId, fields) {
  try {
    const supabase = getSupabase()
    const row = {
      user_id: userId,
      status: fields.status,
      qr: fields.qr ?? null,
      message: fields.message ?? null,
      connected: !!fields.connected,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('whatsapp_status').upsert(row, { onConflict: 'user_id' })
    if (error) console.error(`[Status] Upsert failed for ${userId}:`, error.message)
  } catch (err) {
    console.error(`[Status] write error for ${userId}:`, err.message)
  }
}

async function writeChats(userId, chats) {
  try {
    const supabase = getSupabase()
    await supabase.from('whatsapp_chats').delete().eq('user_id', userId)
    if (chats.length === 0) return
    const rows = chats.map((c) => ({
      user_id: userId,
      chat_id: c.id,
      name: c.name,
      is_group: c.isGroup,
      participant_count: c.participantCount || 0,
      message_count: c.messageCount || 0,
      updated_at: new Date().toISOString(),
    }))
    const { error } = await supabase.from('whatsapp_chats').insert(rows)
    if (error) console.error(`[Chats] insert failed for ${userId}:`, error.message)
  } catch (err) {
    console.error(`[Chats] write error for ${userId}:`, err.message)
  }
}

async function getWatchedChatIds(userId) {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('whatsapp_watched_groups')
      .select('chat_id')
      .eq('user_id', userId)
    if (error) {
      console.error(`[Watched] read error for ${userId}:`, error.message)
      return new Set()
    }
    return new Set((data || []).map((r) => r.chat_id))
  } catch (err) {
    console.error(`[Watched] read error for ${userId}:`, err.message)
    return new Set()
  }
}

function buildClient(userId) {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined

  const client = new Client({
    authStrategy: new LocalAuth({
      dataDir: userAuthDir(userId),
      clientId: sanitizeUserId(userId),
    }),
    puppeteer: {
      headless: true,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
      ],
    },
  })

  client.on('qr', (qr) => {
    console.log(`[Session] QR for ${userId}`)
    writeStatus(userId, { status: 'QR_READY', qr, message: 'Scan QR code', connected: false })
  })

  client.on('authenticated', () => {
    console.log(`[Session] Authenticated ${userId}`)
    writeStatus(userId, { status: 'AUTHENTICATING', qr: null, message: 'Authenticated, loading...', connected: false })
  })

  client.on('auth_failure', (err) => {
    console.error(`[Session] Auth failure ${userId}:`, err)
    writeStatus(userId, { status: 'FAILED', qr: null, message: 'Auth failed', connected: false })
  })

  client.on('ready', async () => {
    console.log(`[Session] Ready ${userId}`)
    writeStatus(userId, { status: 'CONNECTED', qr: null, message: 'Connected', connected: true })

    try {
      const chats = await client.getChats()
      const groups = chats.filter((c) => c.isGroup).map((c) => ({
        id: c.id._serialized,
        name: c.name || 'Unknown Group',
        isGroup: true,
        participantCount: c.participants?.length || 0,
        messageCount: 0,
      }))
      const contacts = chats.filter((c) => !c.isGroup && !c.isBroadcast).map((c) => ({
        id: c.id._serialized,
        name: c.name || c.id.user || 'Unknown',
        isGroup: false,
        participantCount: 0,
        messageCount: 0,
      }))
      await writeChats(userId, [...groups, ...contacts])
      console.log(`[Session] ${userId}: ${groups.length} groups, ${contacts.length} contacts`)
    } catch (err) {
      console.error(`[Session] getChats failed for ${userId}:`, err.message)
    }
  })

  client.on('disconnected', (reason) => {
    console.log(`[Session] Disconnected ${userId}:`, reason)
    writeStatus(userId, { status: 'DISCONNECTED', qr: null, message: 'Disconnected', connected: false })
    sessions.delete(userId)
  })

  client.on('message', async (msg) => {
    if (!messageHandler) return
    try {
      const watched = await getWatchedChatIds(userId)
      if (watched.size === 0) return
      if (!watched.has(msg.from)) return

      let groupName = null
      if (msg.from.includes('@g.us')) {
        try {
          const chat = await msg.getChat()
          groupName = chat.name || 'Group'
        } catch {
          groupName = 'Group'
        }
      }

      let media = null
      if (msg.hasMedia && ['image', 'document'].includes(msg.type)) {
        try {
          const downloaded = await msg.downloadMedia()
          if (downloaded) {
            media = {
              buffer: Buffer.from(downloaded.data, 'base64'),
              mimeType: downloaded.mimetype,
              fileName: downloaded.filename || null,
            }
          }
        } catch (mediaErr) {
          console.warn(`[Session] media download failed: ${mediaErr.message}`)
        }
      }

      messageHandler(userId, {
        id: msg.id._serialized,
        from: msg.from,
        fromMe: msg.fromMe,
        text: msg.body,
        timestamp: msg.timestamp * 1000,
        hasMedia: msg.hasMedia,
        messageType: msg.type,
        groupId: msg.from.includes('@g.us') ? msg.from : null,
        groupName,
        media,
      })
    } catch (err) {
      console.error(`[Session] message handler failed for ${userId}:`, err.message)
    }
  })

  return client
}

async function startSession(userId) {
  let client = sessions.get(userId)
  if (client) return client

  client = buildClient(userId)
  sessions.set(userId, client)
  await writeStatus(userId, { status: 'CONNECTING', qr: null, message: 'Connecting...', connected: false })

  client.initialize().catch((err) => {
    console.error(`[Session] initialize failed for ${userId}:`, err.message)
    writeStatus(userId, { status: 'FAILED', qr: null, message: err.message, connected: false })
    sessions.delete(userId)
  })

  return client
}

async function disconnectSession(userId) {
  const client = sessions.get(userId)
  if (!client) {
    await writeStatus(userId, { status: 'DISCONNECTED', qr: null, message: 'Disconnected', connected: false })
    return
  }
  try {
    await client.destroy()
  } catch (err) {
    console.warn(`[Session] destroy error for ${userId}:`, err.message)
  }
  sessions.delete(userId)
  await writeStatus(userId, { status: 'DISCONNECTED', qr: null, message: 'Disconnected', connected: false })
}

async function logoutSession(userId) {
  const client = sessions.get(userId)
  if (client) {
    try {
      await client.logout()
    } catch (err) {
      console.warn(`[Session] logout error for ${userId}:`, err.message)
      try { await client.destroy() } catch {}
    }
    sessions.delete(userId)
  }
  // Wipe LocalAuth dir so next connect starts fresh
  try {
    const dir = userAuthDir(userId)
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
  } catch (err) {
    console.warn(`[Session] auth dir cleanup failed for ${userId}:`, err.message)
  }
  await writeStatus(userId, { status: 'DISCONNECTED', qr: null, message: 'Logged out', connected: false })
}

function isActive(userId) {
  return sessions.has(userId)
}

function getActiveSessions() {
  return Array.from(sessions.keys())
}

async function resetStaleStatus() {
  try {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('whatsapp_status')
      .update({
        status: 'DISCONNECTED',
        connected: false,
        qr: null,
        message: 'Bridge restarted — reconnect needed',
        updated_at: new Date().toISOString(),
      })
      .eq('connected', true)
    if (error) console.error('[Boot] resetStaleStatus failed:', error.message)
    else console.log('[Boot] cleared stale CONNECTED rows')
  } catch (err) {
    console.error('[Boot] resetStaleStatus error:', err.message)
  }
}

async function shutdown() {
  console.log('[Session] Shutting down all sessions...')
  for (const [userId, client] of sessions) {
    try { await client.destroy() } catch (err) { console.error(`[Session] shutdown ${userId}:`, err.message) }
  }
  sessions.clear()
}

module.exports = {
  setMessageHandler,
  startSession,
  disconnectSession,
  logoutSession,
  isActive,
  getActiveSessions,
  resetStaleStatus,
  shutdown,
}
