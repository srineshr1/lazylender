import React, { useState, useCallback, useId } from 'react'
import { addMonths, subMonths, format } from 'date-fns'
import { getMiniCalDays, isToday, fmtDate } from '../../lib/dateUtils'
import { useEventStore } from '../../store/useEventStore'
import { Icon } from '../Icons'

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DAY_FULL_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function MiniCalendar() {
  const { events, jumpToDate } = useEventStore()
  const [month, setMonth] = useState(new Date())
  const days = getMiniCalDays(month)
  const eventDates = new Set(events.map(e => e.date))
  const monthLabelId = useId()

  const handlePrevMonth = useCallback(() => setMonth(prev => subMonths(prev, 1)), [])
  const handleNextMonth = useCallback(() => setMonth(prev => addMonths(prev, 1)), [])
  const handleDateClick = useCallback(date => jumpToDate(date), [jumpToDate])

  return (
    <nav className="mini-cal px-4 py-4" aria-label="Mini calendar">
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <span
          id={monthLabelId}
          className="mini-cal-month text-[13px] font-medium"
          aria-live="polite"
        >
          {format(month, 'MMMM yyyy')}
        </span>
        <div className="flex gap-0.5">
          <button
            className="mini-cal-nav-btn w-6 h-6 rounded flex items-center justify-center transition-colors"
            onClick={handlePrevMonth}
            aria-label={`Go to ${format(subMonths(month, 1), 'MMMM yyyy')}`}
          >
            <Icon name="chevronLeft" className="w-3 h-3" aria-hidden="true" />
          </button>
          <button
            className="mini-cal-nav-btn w-6 h-6 rounded flex items-center justify-center transition-colors"
            onClick={handleNextMonth}
            aria-label={`Go to ${format(addMonths(month, 1), 'MMMM yyyy')}`}
          >
            <Icon name="chevronRight" className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5" role="grid" aria-labelledby={monthLabelId}>
        {/* Day headers */}
        <div role="row" className="contents">
          {DAY_LABELS.map((l, i) => (
            <div
              key={i}
              role="columnheader"
              className="mini-cal-day-header text-center text-[10px] font-medium uppercase tracking-wide py-1"
              aria-label={DAY_FULL_LABELS[i]}
            >
              {l}
            </div>
          ))}
        </div>

        {/* Date cells */}
        {days.map(({ date, currentMonth }, i) => {
          const dateStr = fmtDate(date)
          const today = isToday(date)
          const hasEv = eventDates.has(dateStr)

          return (
            <button
              key={i}
              role="gridcell"
              onClick={() => handleDateClick(date)}
              aria-label={`${format(date, 'MMMM d, yyyy')}${today ? ' (today)' : ''}${hasEv ? ' (has events)' : ''}`}
              aria-current={today ? 'date' : undefined}
              className={`
                mini-cal-day relative text-center text-[12px] py-1 rounded-full transition-all duration-150
                ${!currentMonth ? 'mini-cal-day--out' : ''}
                ${today ? 'mini-cal-day--today' : 'mini-cal-day--normal'}
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
