/**
 * Timetable Extraction Prompts and Wizard Configuration
 * Used by useLLM.js for the timetable import wizard
 */

/**
 * Wizard steps enum
 */
export const WIZARD_STEPS = {
  IDLE: 'IDLE',
  EXTRACTING: 'EXTRACTING',
  ASK_DATE_RANGE: 'ASK_DATE_RANGE',
  ASK_HOLIDAYS: 'ASK_HOLIDAYS',
  CONFIRM: 'CONFIRM',
  ADDING: 'ADDING',
  COMPLETE: 'COMPLETE',
  ERROR: 'ERROR',
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayISO() {
  return new Date().toISOString().split('T')[0]
}

/**
 * System prompt for extracting timetable from image
 */
export function getExtractionPrompt() {
  return `You are a timetable extraction assistant. Analyze the provided timetable image or text and extract all recurring class/event information.

Today's date is ${getTodayISO()}.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "success": true,
  "classes": [
    {
      "name": "Class/Subject Name",
      "day": "monday|tuesday|wednesday|thursday|friday|saturday|sunday",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "location": "Room/Location (if visible)",
      "instructor": "Teacher name (if visible)"
    }
  ],
  "notes": "Any additional notes about the timetable"
}

If you cannot extract any valid timetable data, return:
{
  "success": false,
  "error": "Brief explanation of what went wrong"
}

Rules:
- Extract ALL classes/events visible in the timetable
- Use 24-hour time format (HH:MM)
- Day names must be lowercase
- If end time is not visible, estimate based on typical class duration (1 hour)
- If location/instructor is not visible, omit those fields
- Be thorough - don't miss any classes`
}

/**
 * System prompt for parsing user's date range response
 */
export function getDateRangeParsePrompt() {
  return `You are a date parser. Parse the user's response to extract a date range for adding recurring events.

Today's date is ${getTodayISO()}.

Return ONLY a valid JSON object (no markdown):
{
  "success": true,
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD"
}

Or if you cannot parse the dates:
{
  "success": false,
  "error": "Brief explanation"
}

Handle various formats:
- "April 8 to May 30" → parse as dates in current/next year
- "8th April - 30th May 2026" → exact dates
- "this semester" → estimate reasonable academic dates
- "next 3 months" → calculate from today
- "till June end" → today to June 30
- Relative terms like "tomorrow", "next week", etc.`
}

/**
 * System prompt for parsing holiday exclusion response
 */
export function getHolidayParsePrompt(holidays) {
  const holidayList = holidays.map(h => `- ${h.date}: ${h.name}`).join('\n')
  
  return `You are parsing the user's response about excluding holidays from their timetable.

Available holidays in their date range:
${holidayList || 'No holidays found'}

Return ONLY a valid JSON object (no markdown):
{
  "excludeAll": true/false,
  "excludeDates": ["YYYY-MM-DD", ...],
  "includeAll": true/false
}

Interpret user responses:
- "yes" / "exclude all" / "skip holidays" → excludeAll: true
- "no" / "don't exclude" / "include all" → includeAll: true  
- "exclude April 14 and May 1" → excludeDates: ["2026-04-14", "2026-05-01"]
- Specific holiday names → match to dates from the list above`
}

/**
 * Format extracted classes for display
 * @param {Array} classes - Array of extracted class objects
 * @returns {string} Formatted markdown string
 */
export function formatClassesForDisplay(classes) {
  if (!classes || classes.length === 0) {
    return 'No classes found in the timetable.'
  }

  // Group by day
  const byDay = {}
  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  
  classes.forEach(cls => {
    const day = cls.day.toLowerCase()
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(cls)
  })

  // Sort each day's classes by start time
  Object.values(byDay).forEach(dayClasses => {
    dayClasses.sort((a, b) => a.startTime.localeCompare(b.startTime))
  })

  // Format output
  let output = ''
  dayOrder.forEach(day => {
    if (byDay[day] && byDay[day].length > 0) {
      const dayCapitalized = day.charAt(0).toUpperCase() + day.slice(1)
      output += `**${dayCapitalized}:**\n`
      byDay[day].forEach(cls => {
        const time = `${cls.startTime}${cls.endTime ? '-' + cls.endTime : ''}`
        const location = cls.location ? ` (${cls.location})` : ''
        output += `  • ${cls.name} - ${time}${location}\n`
      })
      output += '\n'
    }
  })

  return output.trim()
}

/**
 * Format confirmation summary
 * @param {Array} classes - Extracted classes
 * @param {string} startDate - Start date
 * @param {string} endDate - End date  
 * @param {Array} excludedDates - Dates to exclude
 * @param {number} totalEvents - Total events to be created
 * @returns {string} Formatted summary
 */
export function formatConfirmationSummary(classes, startDate, endDate, excludedDates, totalEvents) {
  const classCount = classes.length
  const excludedCount = excludedDates?.length || 0
  
  let summary = `**Summary:**\n`
  summary += `• ${classCount} unique classes found\n`
  summary += `• Date range: ${startDate} to ${endDate}\n`
  if (excludedCount > 0) {
    summary += `• Excluding ${excludedCount} holiday(s)\n`
  }
  summary += `• **${totalEvents} events** will be added to your calendar\n\n`
  summary += `Type **"confirm"** to add all events, or **"cancel"** to abort.`
  
  return summary
}

/**
 * Calculate total events to be created
 * @param {Array} classes - Array of class objects with day property
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {Array} excludedDates - Array of dates to exclude (YYYY-MM-DD)
 * @returns {number} Total number of events
 */
export function calculateTotalEvents(classes, startDate, endDate, excludedDates = []) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const excluded = new Set(excludedDates)
  
  const dayMap = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6
  }
  
  let total = 0
  
  classes.forEach(cls => {
    const targetDay = dayMap[cls.day.toLowerCase()]
    if (targetDay === undefined) return
    
    // Iterate through each day in range
    const current = new Date(start)
    while (current <= end) {
      if (current.getDay() === targetDay) {
        const dateStr = current.toISOString().split('T')[0]
        if (!excluded.has(dateStr)) {
          total++
        }
      }
      current.setDate(current.getDate() + 1)
    }
  })
  
  return total
}

/**
 * Generate all events from classes for a date range
 * @param {Array} classes - Array of class objects
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {Array} excludedDates - Dates to exclude
 * @returns {Array} Array of event objects ready for addEvent()
 */
export function generateEventsFromClasses(classes, startDate, endDate, excludedDates = []) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const excluded = new Set(excludedDates)
  
  const dayMap = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6
  }
  
  // Color rotation for different classes
  const colors = ['pink', 'blue', 'green', 'amber', 'gray']
  const classColors = new Map()
  let colorIndex = 0
  
  const events = []
  
  classes.forEach(cls => {
    const targetDay = dayMap[cls.day.toLowerCase()]
    if (targetDay === undefined) return
    
    // Assign consistent color per class
    if (!classColors.has(cls.name)) {
      classColors.set(cls.name, colors[colorIndex % colors.length])
      colorIndex++
    }
    
    // Calculate duration in minutes
    let duration = 60 // default
    if (cls.startTime && cls.endTime) {
      const [startH, startM] = cls.startTime.split(':').map(Number)
      const [endH, endM] = cls.endTime.split(':').map(Number)
      duration = (endH * 60 + endM) - (startH * 60 + startM)
      if (duration <= 0) duration = 60
    }
    
    // Generate events for each occurrence
    const current = new Date(start)
    while (current <= end) {
      if (current.getDay() === targetDay) {
        const dateStr = current.toISOString().split('T')[0]
        if (!excluded.has(dateStr)) {
          events.push({
            id: `tt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            title: cls.name,
            date: dateStr,
            time: cls.startTime || '09:00',
            duration: duration,
            sub: cls.location || cls.instructor || 'Timetable',
            color: classColors.get(cls.name),
            recurrence: 'none',
            recurrenceEnd: '',
            done: false,
          })
        }
      }
      current.setDate(current.getDate() + 1)
    }
  })
  
  // Sort by date and time
  events.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date)
    if (dateCompare !== 0) return dateCompare
    return a.time.localeCompare(b.time)
  })
  
  return events
}

/**
 * Initial wizard state
 */
export function getInitialWizardState() {
  return {
    step: WIZARD_STEPS.IDLE,
    extractedClasses: [],
    startDate: null,
    endDate: null,
    holidays: [],
    excludedDates: [],
    generatedEvents: [],
    error: null,
  }
}
