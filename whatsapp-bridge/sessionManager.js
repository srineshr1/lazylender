/**
 * Session Manager for WhatsApp Bridge
 * Manages per-user WhatsApp sessions using whatsapp-web.js
 */

const { Client, LocalAuth } = require('whatsapp-web.js')
const fs = require('fs')
const path = require('path')

const { initUserDir, getUserAuthDir, getUserPublicDir, getAllUserIds, sanitizeUserId, writeUserFile, readUserFile } = require('./utils/userData')

const WebSocket = require('ws')
const crypto = require('crypto')

const sessions = new Map()
let messageHandler = null

/**
 * Initialize session manager
 */
function initialize() {
  console.log('[SessionManager] Initializing...')
  
  // Restore existing sessions
  const userIds = getAllUserIds()
  console.log(`[SessionManager] Found ${userIds.length} existing user sessions`)
}

/**
 * Set the message handler callback
 * @param {function} handler - (userId, message) => void
 */
function setMessageHandler(handler) {
  messageHandler = handler
}

/**
 * Create or get a WhatsApp client for a user
 * @param {string} userId - User ID
 * @returns {Client} WhatsApp client instance
 */
function getClient(userId) {
  if (sessions.has(userId)) {
    return sessions.get(userId)
  }
  
  const userAuthDir = getUserAuthDir(userId)
  const userPublicDir = getUserPublicDir(userId)
  
  // Ensure user directories exist
  initUserDir(userId)
  
  // Get Chromium path from environment (set in Dockerfile for Railway)
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined
  
  const client = new Client({
    authStrategy: new LocalAuth({
      dataDir: userAuthDir,
      clientId: sanitizeUserId(userId)  // Use sanitized ID to match directory structure
    }),
    puppeteer: {
      headless: true,
      executablePath: executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    }
  })
  
  client.on('message', async (msg) => {
    if (messageHandler) {
      const chatId = msg.from  // e.g., "123456789@g.us" or "123456789@c.us"
      
      // Check if this chat is in watched groups
      const watchedGroups = readUserFile(userId, 'watched-groups.json') || []
      
      // If no groups selected, skip all messages (require explicit selection)
      if (watchedGroups.length === 0) {
        console.log(`[SessionManager] No watched groups configured for ${userId}, skipping message`)
        return
      }
      
      const isWatched = watchedGroups.some(g => g.id === chatId)
      
      if (!isWatched) {
        // Get chat name for logging
        let chatName = 'Unknown'
        try {
          const chat = await msg.getChat()
          chatName = chat.name || chat.id.user || 'Unknown'
        } catch {
          chatName = msg.from.includes('@g.us') ? 'Group' : 'Contact'
        }
        console.log(`[SessionManager] Skipping message from non-watched chat: ${chatName} (${chatId.slice(0, 20)}...)`)
        return
      }
      
      // Message is from a watched group/contact, process it
      let groupName = null
      if (msg.from.includes('@g.us')) {
        try {
          const chat = await msg.getChat()
          groupName = chat.name || 'Unknown Group'
        } catch {
          groupName = 'Unknown Group'
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
          console.warn(`[SessionManager] Failed to download media for ${userId}: ${mediaErr.message}`)
        }
      }

      const messageData = {
        id: msg.id._serialized,
        from: msg.from,
        fromMe: msg.fromMe,
        text: msg.body,
        timestamp: msg.timestamp * 1000,
        hasMedia: msg.hasMedia,
        messageType: msg.type,
        groupId: msg.from.includes('@g.us') ? msg.from : null,
        groupName: groupName,
        media,
      }
      messageHandler(userId, messageData)
    }
  })
  
  client.on('qr', (qr) => {
    // qr is already a string from whatsapp-web.js
    // Save QR code string to user's public directory
    const qrPath = path.join(userPublicDir, 'qr.txt')
    fs.writeFileSync(qrPath, qr)
    updateUserStatus(userId, { connected: false, qr: qr, message: 'QR Code generated' })
    console.log(`[SessionManager] QR generated for ${userId}`)
  })
  
  client.on('authenticated', () => {
    // Fires immediately when user scans QR - before 'ready'
    console.log(`[SessionManager] Client authenticated for ${userId}`)
    updateUserStatus(userId, { connected: false, qr: null, message: 'Authenticated, loading...' })
  })
  
  client.on('ready', async () => {
    console.log(`[SessionManager] Client ready for ${userId}`)
    updateUserStatus(userId, { connected: true, qr: null, message: 'Connected' })
    
    // Fetch all chats and save groups/contacts
    try {
      const chats = await client.getChats()
      const activity = readUserFile(userId, 'group-activity.json') || {}
      
      // Filter groups (isGroup = true)
      const groups = chats
        .filter(chat => chat.isGroup)
        .map(chat => ({
          id: chat.id._serialized,
          name: chat.name || 'Unknown Group',
          participantCount: chat.participants?.length || 0,
          isGroup: true,
          messageCount: activity[chat.id._serialized] || 0
        }))
        .sort((a, b) => b.messageCount - a.messageCount) // Sort by activity
      
      // Filter individual chats (not group, not broadcast)
      const contacts = chats
        .filter(chat => !chat.isGroup && !chat.isBroadcast)
        .map(chat => ({
          id: chat.id._serialized,
          name: chat.name || chat.id.user || 'Unknown',
          isGroup: false,
          messageCount: activity[chat.id._serialized] || 0
        }))
        .sort((a, b) => b.messageCount - a.messageCount) // Sort by activity
      
      // Save to files
      writeUserFile(userId, 'groups.json', groups)
      writeUserFile(userId, 'contacts.json', contacts)
      
      console.log(`[SessionManager] Loaded ${groups.length} groups and ${contacts.length} contacts for ${userId}`)
    } catch (err) {
      console.error(`[SessionManager] Failed to fetch chats for ${userId}:`, err.message)
    }
  })
  
  client.on('disconnected', (reason) => {
    console.log(`[SessionManager] Client disconnected for ${userId}:`, reason)
    updateUserStatus(userId, { connected: false, qr: null, message: 'Disconnected' })
  })
  
  client.on('auth_failure', (err) => {
    console.error(`[SessionManager] Auth failure for ${userId}:`, err)
    updateUserStatus(userId, { connected: false, qr: null, message: 'Auth failed' })
  })
  
  sessions.set(userId, client)
  return client
}

/**
 * Start the WhatsApp client for a user
 * @param {string} userId - User ID
 */
async function startSession(userId) {
  const client = getClient(userId)
  if (!client.info) {
    await client.initialize()
  }
  return client
}

/**
 * Disconnect a user's session
 * @param {string} userId - User ID
 */
async function logoutSession(userId) {
  const client = sessions.get(userId)
  if (client) {
    await client.logout()
    sessions.delete(userId)
    updateUserStatus(userId, { connected: false, qr: null, message: 'Logged out' })
  }
}

/**
 * Get session state for a user
 * @param {string} userId - User ID
 * @returns {object} { connected: boolean, info: object }
 */
function getSessionState(userId) {
  const client = sessions.get(userId)
  if (!client) {
    return { connected: false, hasSession: false, info: null }
  }
  return {
    connected: !!client.info?.pushName,
    hasSession: true,
    info: client.info || null
  }
}

/**
 * Check if a user has an active session
 * @param {string} userId - User ID
 * @returns {boolean}
 */
function hasSession(userId) {
  return sessions.has(userId)
}

/**
 * Update user status file
 * @param {string} userId - User ID
 * @param {object} status - Status object
 */
function updateUserStatus(userId, status) {
  try {
    const { writeUserFile } = require('./utils/userData')
    writeUserFile(userId, 'status.json', status)
  } catch (err) {
    console.error('[SessionManager] Failed to update status:', err.message)
  }
}

/**
 * Get all active sessions
 * @returns {string[]} Array of user IDs with active sessions
 */
function getActiveSessions() {
  const active = []
  sessions.forEach((client, userId) => {
    if (client.info) {
      active.push(userId)
    }
  })
  return active
}

/**
 * Restore existing sessions from storage
 * @returns {Promise<void>}
 */
async function restoreExistingSessions() {
  const userIds = getAllUserIds()
  console.log(`[SessionManager] Restoring ${userIds.length} existing sessions`)
  
  for (const userId of userIds) {
    try {
      const client = getClient(userId)
      // Don't auto-initialize - let user trigger it
      console.log(`[SessionManager] Prepared session for ${userId}`)
    } catch (err) {
      console.error(`[SessionManager] Failed to restore session for ${userId}:`, err.message)
    }
  }
}

/**
 * Cleanup inactive sessions
 * @returns {Promise<number>} Number of sessions cleaned up
 */
async function cleanupInactiveSessions() {
  const userIds = getAllUserIds()
  let cleaned = 0
  
  for (const userId of userIds) {
    const client = sessions.get(userId)
    if (client && !client.info) {
      // Session exists but not connected - could clean up
      // For now, just log
      console.log(`[SessionManager] Inactive session for ${userId}`)
    }
  }
  
  return cleaned
}

/**
 * Gracefully shutdown all sessions
 * @returns {Promise<void>}
 */
async function shutdown() {
  console.log('[SessionManager] Shutting down all sessions...')
  
  for (const [userId, client] of sessions) {
    try {
      if (client) {
        await client.destroy()
        console.log(`[SessionManager] Destroyed session for ${userId}`)
      }
    } catch (err) {
      console.error(`[SessionManager] Error destroying session for ${userId}:`, err.message)
    }
  }
  
  sessions.clear()
  console.log('[SessionManager] All sessions shut down')
}

// WebSocket client manager - tracks authenticated WS connections per user
const wsClients = new Map() // userId -> Set of WebSocket connections

/**
 * Authenticate a WebSocket connection
 * @param {WebSocket} ws - The WebSocket connection
 * @param {object} credentials - { userId, apiKey }
 * @returns {boolean} true if authenticated
 */
function authenticateWsClient(ws, credentials) {
  const { userId, apiKey } = credentials
  if (!userId || !apiKey) return false

  try {
    const keys = loadApiKeys()
    const stored = keys[userId]
    if (!stored) return false

    // Timing-safe comparison
    const storedBuf = Buffer.from(stored)
    const suppliedBuf = Buffer.from(apiKey)
    if (storedBuf.length !== suppliedBuf.length) return false
    return crypto.timingSafeEqual(storedBuf, suppliedBuf)
  } catch {
    return false
  }
}

function loadApiKeys() {
  const fs = require('fs')
  const path = require('path')
  const API_KEYS_FILE = path.join(__dirname, 'config', 'api-keys.json')
  try {
    return JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf8'))
  } catch {
    return {}
  }
}

/**
 * Register an authenticated WebSocket client for a user
 * @param {string} userId
 * @param {WebSocket} ws
 */
function addWsClient(userId, ws) {
  if (!wsClients.has(userId)) {
    wsClients.set(userId, new Set())
  }
  wsClients.get(userId).add(ws)
  console.log(`[WS] Client connected for user ${userId} (${wsClients.get(userId).size} total)`)
}

/**
 * Remove a WebSocket client
 * @param {string} userId
 * @param {WebSocket} ws
 */
function removeWsClient(userId, ws) {
  const clients = wsClients.get(userId)
  if (clients) {
    clients.delete(ws)
    if (clients.size === 0) {
      wsClients.delete(userId)
    }
  }
  console.log(`[WS] Client disconnected for user ${userId}`)
}

/**
 * Broadcast data to all WebSocket clients of a user
 * @param {string} userId
 * @param {object} data - Data to send (will be JSON.stringify'd)
 */
function broadcastToUser(userId, data) {
  const clients = wsClients.get(userId)
  if (!clients || clients.size === 0) return

  const message = JSON.stringify(data)
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message)
    }
  }
}

/**
 * Get WebSocket server instance (creates on first call)
 * @param {http.Server} server - HTTP server to attach to
 * @returns {WebSocket.Server}
 */
let wss = null

function getWebSocketServer(server) {
  if (wss) return wss

  wss = new WebSocket.Server({ server, path: '/ws' })

  wss.on('connection', (ws, req) => {
    console.log('[WS] New connection from:', req.socket.remoteAddress)

    // Heartbeat
    ws.isAlive = true
    ws.on('pong', () => { ws.isAlive = true })

    let authenticatedUserId = null

    ws.on('message', (rawData) => {
      try {
        const data = JSON.parse(rawData.toString())

        // Auth handshake - must be first message
        if (data.type === 'auth' && !authenticatedUserId) {
          const valid = authenticateWsClient(ws, { userId: data.userId, apiKey: data.apiKey })
          if (valid) {
            authenticatedUserId = data.userId
            addWsClient(data.userId, ws)
            ws.send(JSON.stringify({ type: 'auth_ok' }))
            console.log(`[WS] Authenticated: ${data.userId}`)
          } else {
            ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid credentials' }))
            ws.close()
          }
          return
        }

        // Reject unauthenticated messages
        if (!authenticatedUserId) {
          ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }))
          return
        }

        // Handle incoming messages from client (e.g., ack, clear confirmation)
        if (data.type === 'ack') {
          console.log(`[WS] Ack from ${authenticatedUserId}: received`)
        }
      } catch (err) {
        console.error('[WS] Message parse error:', err.message)
      }
    })

    ws.on('close', () => {
      if (authenticatedUserId) {
        removeWsClient(authenticatedUserId, ws)
      }
    })

    ws.on('error', (err) => {
      console.error('[WS] Socket error:', err.message)
      if (authenticatedUserId) {
        removeWsClient(authenticatedUserId, ws)
      }
    })
  })

  // Heartbeat interval - ping all clients every 30s
  const heartbeat = setInterval(() => {
    if (!wss) return
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        ws.terminate()
        return
      }
      ws.isAlive = false
      ws.ping()
    })
  }, 30000)

  wss.on('close', () => clearInterval(heartbeat))

  console.log('[WS] WebSocket server initialized on /ws path')
  return wss
}

/**
 * Broadcast new WhatsApp events to a user's connected clients
 * Called by whatsappProcessor after events are pushed
 * @param {string} userId
 * @param {Array} events - Array of event objects
 */
function notifyNewEvents(userId, events) {
  broadcastToUser(userId, { type: 'new_events', events })
}

module.exports = {
  initialize,
  setMessageHandler,
  getClient,
  startSession,
  createSession: startSession,
  logoutSession,
  getSessionState,
  hasSession,
  getActiveSessions,
  restoreExistingSessions,
  cleanupInactiveSessions,
  shutdown,
  getWebSocketServer,
  notifyNewEvents,
  broadcastToUser
}
