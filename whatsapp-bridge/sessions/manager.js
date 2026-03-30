/**
 * Session Manager for WhatsApp Bridge
 * Manages per-user WhatsApp sessions using whatsapp-web.js
 */

const { Client, LocalAuth } = require('whatsapp-web.js')
const fs = require('fs')
const path = require('path')

const { initUserDir, getUserAuthDir, getUserPublicDir, getAllUserIds } = require('../utils/userData')

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
  
  const client = new Client({
    authStrategy: new LocalAuth({
      dataDir: userAuthDir,
      clientId: userId
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  })
  
  client.on('message', (msg) => {
    if (messageHandler) {
      const messageData = {
        id: msg.id._serialized,
        from: msg.from,
        fromMe: msg.fromMe,
        text: msg.body,
        timestamp: msg.timestamp * 1000,
        hasMedia: msg.hasMedia,
        messageType: msg.type,
        groupId: msg.from.includes('@g.us') ? msg.from : null,
        groupName: msg.from.includes('@g.us') ? (msg.chat?.name || 'Unknown Group') : null,
      }
      messageHandler(userId, messageData)
    }
  })
  
  client.on('qr', (qr) => {
    // Save QR code to user's public directory
    const qrPath = path.join(userPublicDir, 'qr.png')
    const qrData = qr.qrimage
    fs.writeFileSync(qrPath.replace('.png', '.txt'), qrData)
    updateUserStatus(userId, { connected: false, qr: qrData, message: 'QR Code generated' })
    console.log(`[SessionManager] QR generated for ${userId}`)
  })
  
  client.on('ready', () => {
    console.log(`[SessionManager] Client ready for ${userId}`)
    updateUserStatus(userId, { connected: true, qr: null, message: 'Connected' })
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
    return { connected: false, info: null }
  }
  return {
    connected: client.info ? true : false,
    info: client.info || null
  }
}

/**
 * Check if a user has an active session
 * @param {string} userId - User ID
 * @returns {boolean}
 */
function hasSession(userId) {
  const client = sessions.get(userId)
  return client && client.info ? true : false
}

/**
 * Update user status file
 * @param {string} userId - User ID
 * @param {object} status - Status object
 */
function updateUserStatus(userId, status) {
  try {
    const { writeUserFile } = require('../utils/userData')
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

module.exports = {
  initialize,
  setMessageHandler,
  getClient,
  startSession,
  logoutSession,
  getSessionState,
  hasSession,
  getActiveSessions,
  restoreExistingSessions,
  cleanupInactiveSessions
}
