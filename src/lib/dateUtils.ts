import {
  format, startOfWeek, addDays, addWeeks, subWeeks,
  isSameDay, isSameMonth, parseISO, isValid,
  startOfMonth, endOfMonth, endOfWeek, getDaysInMonth, getDay,
  isToday as fnsIsToday,
} from 'date-fns'

/**
 * Mini calendar day representation
 */
export interface MiniCalDay {
  date: Date
  currentMonth: boolean
}

/**
 * Base event interface (matches store Event type)
 */
export interface BaseEvent {
  id: string
  title: string
  date: string
  time: string
  duration: number
  sub?: string
  color?: string
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly'
  recurrenceEnd?: string
  done?: boolean
  cancelled?: boolean
  location?: string
}

/**
 * Expanded recurring event with additional metadata
 */
export interface ExpandedEvent extends BaseEvent {
  _recurring?: boolean
  _sourceId?: string
}

/**
 * Format a date with a custom pattern
 * @param d - Date to format
 * @param pattern - date-fns format pattern (e.g., 'yyyy-MM-dd', 'HH:mm')
 * @returns Formatted date string
 * @example
 * fmt(new Date(), 'yyyy-MM-dd') // '2024-03-21'
 */
export const fmt = (d: Date, pattern: string): string => format(d, pattern)

/**
 * Format a date as ISO date string (YYYY-MM-DD)
 * @param d - Date to format
 * @returns ISO date string
 * @example
 * fmtDate(new Date('2024-03-21')) // '2024-03-21'
 */
export const fmtDate = (d: Date): string => format(d, 'yyyy-MM-dd')

/**
 * Format a date as time string (HH:mm)
 * @param d - Date to format
 * @returns Time string in 24-hour format
 * @example
 * fmtTime(new Date('2024-03-21T14:30:00')) // '14:30'
 */
export const fmtTime = (d: Date): string => format(d, 'HH:mm')

/**
 * Parse ISO date string to Date object with fallback
 * @param s - ISO date string
 * @returns Parsed Date or current date if invalid
 * @example
 * parseDate('2024-03-21') // Date object
 * parseDate('invalid') // new Date() (fallback)
 */
export const parseDate = (s: string): Date => {
  const d = parseISO(s)
  return isValid(d) ? d : new Date()
}

/**
 * Get the start of the work week (Monday) for a given date
 * @param d - Reference date
 * @returns Date representing the Monday of that week
 * @example
 * getWorkWeekStart(new Date('2024-03-21')) // Monday of that week
 */
export const getWorkWeekStart = (d: Date): Date =>
  startOfWeek(d, { weekStartsOn: 1 })

/**
 * Get 5 work weekdays (Monday - Friday) from a given week start
 * @param weekStart - Monday of the week (from getWorkWeekStart)
 * @returns Array of 5 Date objects (Mon-Fri)
 * @example
 * getWorkWeekDays(monday) // [Mon, Tue, Wed, Thu, Fri]
 */
export const getWorkWeekDays = (weekStart: Date): Date[] =>
  Array.from({ length: 5 }, (_, i) => addDays(weekStart, i))

/**
 * Get full 7-day week (Sunday - Saturday) from a given week start
 * @param weekStart - Monday of the week (from getWorkWeekStart)
 * @returns Array of 7 Date objects (Sun-Sat)
 * @example
 * getFullWeekDays(monday) // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
 */
export const getFullWeekDays = (weekStart: Date): Date[] =>
  Array.from({ length: 7 }, (_, i) => addDays(weekStart, i - 1))

/**
 * Get all days in a month with padding for calendar grid
 * Returns 35 or 42 days to fill complete weeks in calendar
 * @param date - Any date within the target month
 * @returns Array of Date objects starting from previous month's padding
 * @example
 * getMonthDays(new Date('2024-03-15'))
 * // Returns array starting from last days of Feb, all of March, first days of April
 */
export const getMonthDays = (date: Date): Date[] => {
  const firstDay = startOfMonth(date)
  const lastDay = endOfMonth(date)
  
  // Get the Monday of the week containing the first day
  const startDate = startOfWeek(firstDay, { weekStartsOn: 1 })
  
  // Get the Sunday of the week containing the last day
  const endDate = endOfWeek(lastDay, { weekStartsOn: 1 })
  
  // Generate array of dates
  const days: Date[] = []
  let currentDate = startDate
  
  while (currentDate <= endDate) {
    days.push(currentDate)
    currentDate = addDays(currentDate, 1)
  }
  
  return days
}

/**
 * Add one week to a date
 * @param d - Input date
 * @returns Date one week later
 */
export const addWeek = (d: Date): Date => addWeeks(d, 1)

/**
 * Subtract one week from a date
 * @param d - Input date
 * @returns Date one week earlier
 */
export const subWeek = (d: Date): Date => subWeeks(d, 1)

/**
 * Check if two dates are the same day
 */
export const isSame = isSameDay

/**
 * Check if a date is in the same month as another
 */
export const isThisMonth = isSameMonth

/**
 * Check if a date is today
 */
export const isToday = fnsIsToday

/**
 * Generate calendar grid days for mini calendar (includes padding days)
 * @param monthDate - Any date in the target month
 * @returns Array of calendar days with currentMonth flag
 * @example
 * getMiniCalDays(new Date('2024-03-01'))
 * // Returns array with prev month padding, all March days, and next month padding
 */
export const getMiniCalDays = (monthDate: Date): MiniCalDay[] => {
  const first = startOfMonth(monthDate)
  // Monday-based week: 0=Mon … 6=Sun
  let startPad = getDay(first) - 1
  if (startPad < 0) startPad = 6

  const days: MiniCalDay[] = []
  // prev month padding
  for (let i = startPad - 1; i >= 0; i--) {
    days.push({ date: addDays(first, -i - 1), currentMonth: false })
  }
  // current month
  const total = getDaysInMonth(monthDate)
  for (let d = 0; d < total; d++) {
    days.push({ date: addDays(first, d), currentMonth: true })
  }
  // next month padding to complete grid
  const remainder = 7 - (days.length % 7)
  if (remainder < 7) {
    const last = days[days.length - 1]!.date
    for (let i = 1; i <= remainder; i++) {
      days.push({ date: addDays(last, i), currentMonth: false })
    }
  }
  return days
}

/**
 * Convert time string (HH:mm) to minutes since midnight
 * @param time - Time string in 24-hour format
 * @returns Minutes since midnight (0-1439)
 * @example
 * timeToMinutes('14:30') // 870 (14*60 + 30)
 * timeToMinutes('00:00') // 0
 * timeToMinutes('23:59') // 1439
 */
export const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number)
  return h! * 60 + m!
}

/**
 * Convert minutes since midnight to time string (HH:mm)
 * @param mins - Minutes since midnight (0-1439)
 * @returns Time string in 24-hour format
 * @example
 * minutesToTime(870) // '14:30'
 * minutesToTime(0) // '00:00'
 * minutesToTime(1439) // '23:59'
 */
export const minutesToTime = (mins: number): string => {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Snap minutes to nearest 15-minute interval
 * @param mins - Minutes to snap
 * @returns Minutes rounded to nearest 15-minute mark
 * @example
 * snapTo15(127) // 120 (2:00)
 * snapTo15(128) // 135 (2:15)
 * snapTo15(870) // 870 (14:30 - already on interval)
 */
export const snapTo15 = (mins: number): number => Math.round(mins / 15) * 15

/**
 * Get week date range as formatted string
 * @param weekStart - Monday of the week
 * @returns Formatted string like "Mar 18 - Mar 22"
 * @example
 * weekRange(new Date('2024-03-18')) // 'Mar 18 - Mar 22'
 */
export const weekRange = (weekStart: Date): string => {
  const start = format(weekStart, 'MMM d')
  const end = format(addDays(weekStart, 4), 'MMM d')
  return `${start} - ${end}`
}

/**
 * Expand recurring events for display across a week's dates
 * 
 * Takes an array of events (some may be recurring) and expands them to show
 * on all applicable days within the given week dates. Recurring events generate
 * virtual instances with modified IDs and _recurring flag.
 * 
 * @param events - Array of events (may include recurring events)
 * @param weekDates - Array of dates to expand events across (typically Mon-Fri)
 * @returns Array of events with recurring events expanded to multiple instances
 * 
 * @example
 * const events = [
 *   { id: 'e1', title: 'Daily Standup', date: '2024-03-18', recurrence: 'daily', ... }
 * ]
 * const weekDates = getWorkWeekDays(new Date('2024-03-18'))
 * expandRecurring(events, weekDates)
 * // Returns 5 instances of the standup (one per day)
 * // Each with unique ID like 'e1_2024-03-18', 'e1_2024-03-19', etc.
 */
export const expandRecurring = (events: BaseEvent[], weekDates: Date[]): ExpandedEvent[] => {
  const expanded: ExpandedEvent[] = []
  const weekDateStrs = weekDates.map(d => fmtDate(d))
  
  for (const ev of events) {
    // Skip if event date is not in this week
    if (!weekDateStrs.includes(ev.date)) {
      continue
    }
    
    // Non-recurring events: add if date is in this week
    if (!ev.recurrence || ev.recurrence === 'none') {
      expanded.push(ev)
      continue
    }
    
    const evDate = parseISO(ev.date)
    
    for (const wd of weekDates) {
      // If this is the original date, add the original event
      if (fmtDate(wd) === ev.date) {
        expanded.push(ev)
        continue
      }
      
      // Check if this date matches the recurrence pattern
      let matches = false
      if (ev.recurrence === 'daily') {
        matches = true
      } else if (ev.recurrence === 'weekly') {
        matches = getDay(wd) === getDay(evDate)
      } else if (ev.recurrence === 'monthly') {
        matches = wd.getDate() === evDate.getDate()
      }
      
      // If matches and not past recurrence end date, create virtual instance
      if (matches) {
        if (ev.recurrenceEnd && wd > parseISO(ev.recurrenceEnd)) continue
        
        expanded.push({
          ...ev,
          id: `${ev.id}_${fmtDate(wd)}`,
          date: fmtDate(wd),
          _recurring: true,
          _sourceId: ev.id
        })
      }
    }
  }
  
  return expanded
}
