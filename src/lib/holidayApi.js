/**
 * Holiday API Client using Nager.Date (free, no API key required)
 * https://date.nager.at/Api
 */

const NAGER_API_BASE = 'https://date.nager.at/api/v3'

// Cache for holidays to avoid repeated API calls
const holidayCache = new Map()

/**
 * Auto-detect user's country code from browser locale
 * @returns {string} ISO 3166-1 alpha-2 country code (e.g., 'IN', 'US', 'GB')
 */
export function detectCountryCode() {
  try {
    // Try navigator.language first (e.g., 'en-IN', 'en-US')
    const locale = navigator.language || navigator.userLanguage || 'en-US'
    const parts = locale.split('-')
    
    if (parts.length >= 2) {
      const countryCode = parts[parts.length - 1].toUpperCase()
      // Validate it's a 2-letter code
      if (/^[A-Z]{2}$/.test(countryCode)) {
        return countryCode
      }
    }
    
    // Fallback: try to get from timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const timezoneCountryMap = {
      'Asia/Kolkata': 'IN',
      'Asia/Calcutta': 'IN',
      'America/New_York': 'US',
      'America/Los_Angeles': 'US',
      'America/Chicago': 'US',
      'Europe/London': 'GB',
      'Europe/Paris': 'FR',
      'Europe/Berlin': 'DE',
      'Asia/Tokyo': 'JP',
      'Asia/Shanghai': 'CN',
      'Australia/Sydney': 'AU',
      'Asia/Singapore': 'SG',
      'Asia/Dubai': 'AE',
      'America/Toronto': 'CA',
    }
    
    if (timezoneCountryMap[timezone]) {
      return timezoneCountryMap[timezone]
    }
    
    // Default to India as per user's context
    return 'IN'
  } catch {
    return 'IN'
  }
}

/**
 * Get cache key for holidays
 * @param {number} year 
 * @param {string} countryCode 
 * @returns {string}
 */
function getCacheKey(year, countryCode) {
  return `${year}-${countryCode}`
}

/**
 * Fetch public holidays for a given year and country
 * @param {number} year - The year (e.g., 2026)
 * @param {string} countryCode - ISO 3166-1 alpha-2 code (e.g., 'IN', 'US')
 * @returns {Promise<Array<{date: string, name: string, localName: string, types: string[]}>>}
 */
export async function getPublicHolidays(year, countryCode = null) {
  const country = countryCode || detectCountryCode()
  const cacheKey = getCacheKey(year, country)
  
  // Return cached data if available
  if (holidayCache.has(cacheKey)) {
    return holidayCache.get(cacheKey)
  }
  
  try {
    const response = await fetch(`${NAGER_API_BASE}/PublicHolidays/${year}/${country}`)
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[HolidayAPI] No holiday data for ${country} in ${year}`)
        return []
      }
      throw new Error(`HTTP ${response.status}`)
    }
    
    const holidays = await response.json()
    
    // Normalize the response
    const normalized = holidays.map(h => ({
      date: h.date,
      name: h.name,
      localName: h.localName,
      types: h.types || ['Public'],
      global: h.global !== false,
    }))
    
    // Cache the result
    holidayCache.set(cacheKey, normalized)
    
    return normalized
  } catch (error) {
    console.error('[HolidayAPI] Failed to fetch holidays:', error.message)
    return []
  }
}

/**
 * Get holidays within a date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {string} countryCode - Optional country code
 * @returns {Promise<Array<{date: string, name: string, localName: string}>>}
 */
export async function getHolidaysInRange(startDate, endDate, countryCode = null) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  // Get years covered by the range
  const startYear = start.getFullYear()
  const endYear = end.getFullYear()
  
  // Fetch holidays for all years in range
  const holidayPromises = []
  for (let year = startYear; year <= endYear; year++) {
    holidayPromises.push(getPublicHolidays(year, countryCode))
  }
  
  const allHolidays = (await Promise.all(holidayPromises)).flat()
  
  // Filter to only include holidays within the date range
  return allHolidays.filter(h => {
    const holidayDate = new Date(h.date)
    return holidayDate >= start && holidayDate <= end
  })
}

/**
 * Check if a specific date is a holiday
 * @param {string} date - Date to check (YYYY-MM-DD)
 * @param {string} countryCode - Optional country code
 * @returns {Promise<{isHoliday: boolean, holiday: object|null}>}
 */
export async function isHoliday(date, countryCode = null) {
  const year = new Date(date).getFullYear()
  const holidays = await getPublicHolidays(year, countryCode)
  
  const holiday = holidays.find(h => h.date === date)
  return {
    isHoliday: !!holiday,
    holiday: holiday || null,
  }
}

/**
 * Get list of supported countries
 * @returns {Promise<Array<{countryCode: string, name: string}>>}
 */
export async function getSupportedCountries() {
  try {
    const response = await fetch(`${NAGER_API_BASE}/AvailableCountries`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('[HolidayAPI] Failed to fetch countries:', error.message)
    return []
  }
}

/**
 * Clear the holiday cache (useful for testing or forcing refresh)
 */
export function clearHolidayCache() {
  holidayCache.clear()
}

/**
 * Format holidays for display in chat
 * @param {Array} holidays - Array of holiday objects
 * @returns {string} Formatted string for display
 */
export function formatHolidaysForDisplay(holidays) {
  if (!holidays || holidays.length === 0) {
    return 'No public holidays found in this period.'
  }
  
  return holidays
    .map(h => `• ${h.date} - ${h.name}`)
    .join('\n')
}
