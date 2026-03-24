const fs = require('fs')
const path = require('path')

/**
 * Per-User Data Management Utilities
 * Provides isolated file storage for each user's WhatsApp session
 */

const SESSIONS_DIR = path.join(__dirname, '..', 'sessions')

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true })
}

/**
 * Sanitize user ID to prevent directory traversal attacks
 * @param {string} userId - User ID
 * @returns {string} Sanitized user ID
 */
function sanitizeUserId(userId) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid user ID')
  }
  
  // Remove any path separators and special characters
  const sanitized = userId.replace(/[^a-zA-Z0-9_-]/g, '')
  
  if (sanitized.length === 0) {
    throw new Error('User ID contains no valid characters')
  }
  
  return sanitized
}

/**
 * Get user's session directory path
 * @param {string} userId - User ID
 * @returns {string} Absolute path to user's session directory
 */
function getUserDir(userId) {
  const sanitized = sanitizeUserId(userId)
  return path.join(SESSIONS_DIR, `user_${sanitized}`)
}

/**
 * Get user's public data directory
 * @param {string} userId - User ID
 * @returns {string} Absolute path to user's public directory
 */
function getUserPublicDir(userId) {
  return path.join(getUserDir(userId), 'public')
}

/**
 * Get user's WhatsApp auth directory
 * @param {string} userId - User ID
 * @returns {string} Absolute path to user's auth directory
 */
function getUserAuthDir(userId) {
  return path.join(getUserDir(userId), '.wwebjs_auth')
}

/**
 * Initialize user's directory structure
 * @param {string} userId - User ID
 */
function initUserDir(userId) {
  const userDir = getUserDir(userId)
  const publicDir = getUserPublicDir(userId)
  const authDir = getUserAuthDir(userId)
  
  // Create directories
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true })
  }
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }
  
  // Initialize default files
  const files = {
    'events.json': '[]',
    'groups.json': '[]',
    'watched-groups.json': '[]',
    'group-activity.json': '{}',
    'status.json': JSON.stringify({ connected: false, qr: null, message: 'Disconnected' })
  }
  
  Object.entries(files).forEach(([filename, content]) => {
    const filePath = path.join(publicDir, filename)
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content)
    }
  })
}

/**
 * Read JSON file from user's directory
 * @param {string} userId - User ID
 * @param {string} filename - Filename (e.g., 'events.json')
 * @returns {any} Parsed JSON data
 */
function readUserFile(userId, filename) {
  try {
    const filePath = path.join(getUserPublicDir(userId), filename)
    const data = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(data)
  } catch (err) {
    // Return default based on filename
    if (filename.includes('.json')) {
      return filename.includes('activity') ? {} : []
    }
    return null
  }
}

/**
 * Write JSON file to user's directory
 * @param {string} userId - User ID
 * @param {string} filename - Filename (e.g., 'events.json')
 * @param {any} data - Data to write
 */
function writeUserFile(userId, filename, data) {
  const filePath = path.join(getUserPublicDir(userId), filename)
  const jsonData = JSON.stringify(data, null, 2)
  fs.writeFileSync(filePath, jsonData)
}

/**
 * Check if user directory exists
 * @param {string} userId - User ID
 * @returns {boolean} True if user directory exists
 */
function userDirExists(userId) {
  try {
    return fs.existsSync(getUserDir(userId))
  } catch {
    return false
  }
}

/**
 * Delete user's directory and all data
 * @param {string} userId - User ID
 */
function deleteUserDir(userId) {
  const userDir = getUserDir(userId)
  if (fs.existsSync(userDir)) {
    fs.rmSync(userDir, { recursive: true, force: true })
  }
}

/**
 * Get all user IDs with sessions
 * @returns {string[]} Array of user IDs
 */
function getAllUserIds() {
  try {
    const dirs = fs.readdirSync(SESSIONS_DIR)
    return dirs
      .filter(dir => dir.startsWith('user_'))
      .map(dir => dir.replace('user_', ''))
  } catch {
    return []
  }
}

/**
 * Update user's status file
 * @param {string} userId - User ID
 * @param {object} status - Status object
 */
function updateUserStatus(userId, status) {
  writeUserFile(userId, 'status.json', status)
}

/**
 * Get user's status
 * @param {string} userId - User ID
 * @returns {object} Status object
 */
function getUserStatus(userId) {
  return readUserFile(userId, 'status.json') || { connected: false, qr: null, message: 'Disconnected' }
}

module.exports = {
  sanitizeUserId,
  getUserDir,
  getUserPublicDir,
  getUserAuthDir,
  initUserDir,
  readUserFile,
  writeUserFile,
  userDirExists,
  deleteUserDir,
  getAllUserIds,
  updateUserStatus,
  getUserStatus
}
