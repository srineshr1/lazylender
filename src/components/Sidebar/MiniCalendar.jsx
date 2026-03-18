import React, { useState } from 'react'
import { addMonths, subMonths, format } from 'date-fns'
import { getMiniCalDays, isToday, fmtDate } from '../../lib/dateUtils'
import { useEventStore } from '../../store/useEventStore'
import { useDarkStore } from '../../store/useDarkStore'
import { Icon } from '../Icons'

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function MiniCalendar() {
  const { events, jumpToDate } = useEventStore()
  const { isDark } = useDarkStore()
  const [month, setMonth] = useState(new Date())
  const days = getMiniCalDays(month)
  const eventDates = new Set(events.map((e) => e.date))

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[13px] font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
          {format(month, 'MMMM yyyy')}
        </span>
        <div className="flex gap-1">
          <button
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
              isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-white/10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setMonth(subMonths(month, 1))}
          >
            <Icon name="chevronLeft" className="w-3 h-3" />
          </button>
          <button
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
              isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-white/10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setMonth(addMonths(month, 1))}
          >
            <Icon name="chevronRight" className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {DAY_LABELS.map((l, i) => (
          <div key={i} className={`text-center text-[10px] font-medium uppercase tracking-wide py-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{l}</div>
        ))}
        {days.map(({ date, currentMonth }, i) => {
          const dateStr = fmtDate(date)
          const today = isToday(date)
          const hasEv = eventDates.has(dateStr)
          return (
            <button
              key={i}
              onClick={() => jumpToDate(date)}
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
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
