import React, { useState, useCallback, useId } from 'react'
import { addMonths, subMonths, format } from 'date-fns'
import { getMiniCalDays, isToday, fmtDate } from '../../lib/dateUtils'
import { useEventStore } from '../../store/useEventStore'
import { useDarkStore } from '../../store/useDarkStore'
import { Icon } from '../Icons'
import { formatDateForSR, KEYS } from '../../lib/accessibility'

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DAY_FULL_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function MiniCalendar() {
  const { events, jumpToDate } = useEventStore()
  const { isDark } = useDarkStore()
  const [month, setMonth] = useState(new Date())
  const days = getMiniCalDays(month)
  const eventDates = new Set(events.map((e) => e.date))
  const gridId = useId()
  const monthLabelId = useId()

  const handlePrevMonth = useCallback(() => {
    setMonth(prev => subMonths(prev, 1))
  }, [])

  const handleNextMonth = useCallback(() => {
    setMonth(prev => addMonths(prev, 1))
  }, [])

  const handleDateClick = useCallback((date) => {
    jumpToDate(date)
  }, [jumpToDate])

  const handleKeyDown = useCallback((event, date) => {
    if (event.key === KEYS.ENTER || event.key === KEYS.SPACE) {
      event.preventDefault()
      jumpToDate(date)
    }
  }, [jumpToDate])

  return (
    <nav className="px-4 py-4" aria-label="Mini calendar">
      <div className="flex items-center justify-between mb-3">
        <span 
          id={monthLabelId}
          className={`text-[13px] font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}
          aria-live="polite"
        >
          {format(month, 'MMMM yyyy')}
        </span>
        <div className="flex gap-1" role="group" aria-label="Navigate months">
          <button
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
              isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-white/10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
            }`}
            onClick={handlePrevMonth}
            aria-label={`Go to previous month, ${format(subMonths(month, 1), 'MMMM yyyy')}`}
          >
            <Icon name="chevronLeft" className="w-3 h-3" aria-hidden="true" />
          </button>
          <button
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
              isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-white/10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
            }`}
            onClick={handleNextMonth}
            aria-label={`Go to next month, ${format(addMonths(month, 1), 'MMMM yyyy')}`}
          >
            <Icon name="chevronRight" className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div 
        id={gridId}
        className="grid grid-cols-7 gap-0.5" 
        role="grid" 
        aria-labelledby={monthLabelId}
      >
        <div role="row" className="contents">
          {DAY_LABELS.map((l, i) => (
            <div 
              key={i} 
              role="columnheader"
              className={`text-center text-[10px] font-medium uppercase tracking-wide py-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
              aria-label={DAY_FULL_LABELS[i]}
            >
              {l}
            </div>
          ))}
        </div>
        {days.map(({ date, currentMonth }, i) => {
          const dateStr = fmtDate(date)
          const today = isToday(date)
          const hasEv = eventDates.has(dateStr)
          const dayLabel = formatDateForSR(date)
          const eventLabel = hasEv ? ' (has events)' : ''
          const todayLabel = today ? ' (today)' : ''
          
          return (
            <button
              key={i}
              role="gridcell"
              onClick={() => handleDateClick(date)}
              onKeyDown={(e) => handleKeyDown(e, date)}
              aria-label={`${dayLabel}${todayLabel}${eventLabel}`}
              aria-current={today ? 'date' : undefined}
              className={`
                relative text-center text-[12px] py-1 rounded transition-all
                ${!currentMonth ? 'opacity-30' : ''}
                ${today
                  ? 'bg-sidebar-deep text-white font-semibold'
                  : isDark 
                    ? 'text-gray-300 hover:bg-white/10 hover:text-gray-200' 
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'}
              `}
            >
              {date.getDate()}
              {hasEv && !today && (
                <span 
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" 
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
