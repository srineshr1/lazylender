import {
  format, startOfWeek, addDays, addWeeks, subWeeks,
  isSameDay, isSameMonth, parseISO, isValid,
  startOfMonth, getDaysInMonth, getDay,
  addMonths, subMonths, isToday as fnsIsToday,
} from 'date-fns'

export const fmt = (d, pattern) => format(d, pattern)
export const fmtDate = (d) => format(d, 'yyyy-MM-dd')
export const fmtTime = (d) => format(d, 'HH:mm')
export const parseDate = (s) => { const d = parseISO(s); return isValid(d) ? d : new Date() }

export const getWorkWeekStart = (d) =>
  startOfWeek(d, { weekStartsOn: 1 })

export const getWorkWeekDays = (weekStart) =>
  Array.from({ length: 5 }, (_, i) => addDays(weekStart, i))

export const addWeek = (d) => addWeeks(d, 1)
export const subWeek = (d) => subWeeks(d, 1)

export const isSame = isSameDay
export const isThisMonth = isSameMonth
export const isToday = fnsIsToday

export const getMiniCalDays = (monthDate) => {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const first = startOfMonth(monthDate)
  // Monday-based week: 0=Mon … 6=Sun
  let startPad = getDay(first) - 1
  if (startPad < 0) startPad = 6

  const days = []
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
    const last = days[days.length - 1].date
    for (let i = 1; i <= remainder; i++) {
      days.push({ date: addDays(last, i), currentMonth: false })
    }
  }
  return days
}

export const timeToMinutes = (time) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export const minutesToTime = (mins) => {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export const snapTo15 = (mins) => Math.round(mins / 15) * 15

// Expand recurring events for a given week's dates array
export const expandRecurring = (events, weekDates) => {
  const expanded = []
  for (const ev of events) {
    if (!ev.recurrence || ev.recurrence === 'none') {
      expanded.push(ev)
      continue
    }
    const evDate = parseISO(ev.date)
    for (const wd of weekDates) {
      if (fmtDate(wd) === ev.date) { expanded.push(ev); continue }
      let matches = false
      if (ev.recurrence === 'daily') matches = true
      if (ev.recurrence === 'weekly') matches = getDay(wd) === getDay(evDate)
      if (ev.recurrence === 'monthly') matches = wd.getDate() === evDate.getDate()
      if (matches) {
        if (ev.recurrenceEnd && wd > parseISO(ev.recurrenceEnd)) continue
        expanded.push({ ...ev, id: `${ev.id}_${fmtDate(wd)}`, date: fmtDate(wd), _recurring: true, _sourceId: ev.id })
      }
    }
  }
  return expanded
}
