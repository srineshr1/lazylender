/**
 * Event Validation Utilities
 * 
 * Provides validation functions for event data to ensure data integrity
 * and prevent invalid data from being stored in the calendar.
 */

/**
 * Validates event data and returns validation result with errors
 * @param {Object} event - Event object to validate
 * @returns {Object} - { isValid: boolean, errors: Object }
 */
export function validateEvent(event) {
  const errors = {}

  // Title validation
  if (!event.title || typeof event.title !== 'string') {
    errors.title = 'Title is required'
  } else if (event.title.trim().length === 0) {
    errors.title = 'Title cannot be empty'
  } else if (event.title.length > 100) {
    errors.title = 'Title must be less than 100 characters'
  } else if (containsHtmlTags(event.title)) {
    errors.title = 'Title cannot contain HTML tags'
  }

  // Date validation (must be YYYY-MM-DD format)
  if (!event.date || typeof event.date !== 'string') {
    errors.date = 'Date is required'
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
    errors.date = 'Date must be in YYYY-MM-DD format'
  } else if (!isValidDate(event.date)) {
    errors.date = 'Invalid date'
  }

  // Time validation (must be HH:MM format, 24-hour)
  if (!event.time || typeof event.time !== 'string') {
    errors.time = 'Time is required'
  } else if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(event.time)) {
    errors.time = 'Time must be in HH:MM format (24-hour)'
  }

  // Duration validation (must be positive number, reasonable range)
  if (event.duration === undefined || event.duration === null) {
    errors.duration = 'Duration is required'
  } else if (typeof event.duration !== 'number') {
    errors.duration = 'Duration must be a number'
  } else if (event.duration < 5) {
    errors.duration = 'Duration must be at least 5 minutes'
  } else if (event.duration > 1440) {
    errors.duration = 'Duration cannot exceed 24 hours (1440 minutes)'
  }

  // Color validation (optional, but if provided must be valid)
  if (event.color) {
    const validColors = ['pink', 'green', 'blue', 'amber', 'gray']
    if (!validColors.includes(event.color)) {
      errors.color = 'Color must be one of: pink, green, blue, amber, gray'
    }
  }

  // Recurrence validation (optional, but if provided must be valid)
  if (event.recurrence) {
    const validRecurrence = ['none', 'daily', 'weekly', 'monthly']
    if (!validRecurrence.includes(event.recurrence)) {
      errors.recurrence = 'Recurrence must be one of: none, daily, weekly, monthly'
    }
  }

  // RecurrenceEnd validation (if provided, must be valid date and after start date)
  if (event.recurrenceEnd && event.recurrenceEnd !== '') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(event.recurrenceEnd)) {
      errors.recurrenceEnd = 'Recurrence end date must be in YYYY-MM-DD format'
    } else if (!isValidDate(event.recurrenceEnd)) {
      errors.recurrenceEnd = 'Invalid recurrence end date'
    } else if (event.date && event.recurrenceEnd < event.date) {
      errors.recurrenceEnd = 'Recurrence end date must be after start date'
    }
  }

  // Subtitle/location validation (optional)
  if (event.sub && typeof event.sub === 'string') {
    if (event.sub.length > 200) {
      errors.sub = 'Location/subtitle must be less than 200 characters'
    } else if (containsHtmlTags(event.sub)) {
      errors.sub = 'Location/subtitle cannot contain HTML tags'
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Validates if a date string is a valid date
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {boolean}
 */
function isValidDate(dateStr) {
  const date = new Date(dateStr)
  return date instanceof Date && !isNaN(date) && date.toISOString().startsWith(dateStr)
}

/**
 * Checks if a string contains HTML tags
 * @param {string} str - String to check
 * @returns {boolean}
 */
function containsHtmlTags(str) {
  const htmlTagPattern = /<\/?[a-z][\s\S]*>/i
  return htmlTagPattern.test(str)
}

/**
 * Sanitizes a string by removing potentially dangerous characters
 * @param {string} str - String to sanitize
 * @returns {string}
 */
export function sanitizeString(str, shouldTrim = true) {
  if (typeof str !== 'string') return ''
  
  // Remove HTML tags and dangerous patterns
  let result = str.replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
  
  // Only disable trimming when explicitly requested (e.g., while typing)
  return shouldTrim ? result.trim() : result
}

/**
 * Validates a search query to prevent injection attacks
 * @param {string} query - Search query
 * @returns {boolean}
 */
export function validateSearchQuery(query) {
  if (typeof query !== 'string') return false
  if (query.length > 200) return false
  if (containsHtmlTags(query)) return false
  return true
}

/**
 * Validates time zone offset hours (for awake/sleep settings)
 * @param {number} hour - Hour value (0-24)
 * @returns {boolean}
 */
export function validateHour(hour) {
  return typeof hour === 'number' && hour >= 0 && hour <= 24 && Number.isInteger(hour)
}

/**
 * Quick validation for required fields only (for faster checks)
 * @param {Object} event - Event object
 * @returns {boolean}
 */
export function hasRequiredFields(event) {
  return !!(
    event &&
    event.title &&
    typeof event.title === 'string' &&
    event.title.trim().length > 0 &&
    event.date &&
    typeof event.date === 'string' &&
    event.time &&
    typeof event.time === 'string' &&
    event.duration !== undefined &&
    event.duration !== null
  )
}

/**
 * Validates and sanitizes an event object
 * Returns a clean, validated event or null if invalid
 * @param {Object} event - Event to validate and sanitize
 * @returns {Object|null} - Sanitized event or null
 */
export function validateAndSanitizeEvent(event) {
  const validation = validateEvent(event)
  
  if (!validation.isValid) {
    return null
  }

  return {
    ...event,
    title: sanitizeString(event.title, true),
    sub: event.sub ? sanitizeString(event.sub, true) : '',
  }
}
