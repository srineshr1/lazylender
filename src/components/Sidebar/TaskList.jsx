import React, { useRef } from 'react'
import { useEventStore, getTaskStatus, STATUS_STYLES } from '../../store/useEventStore'
import { useDarkStore } from '../../store/useDarkStore'
import { isSameMonth } from 'date-fns'
import { parseDate } from '../../lib/dateUtils'
import { Icon } from '../Icons'

export default function TaskList({ onAdd }) {
  const { events, markDone, cancelEvent } = useEventStore()
  const { isDark } = useDarkStore()
  const now = new Date()
  const doubleClickTimers = useRef({})

  const monthEvents = events
    .filter((e) => isSameMonth(parseDate(e.date), now) && !e.cancelled)
    .slice(0, 8)

  const handleClick = (id) => {
    // Double-click detection via timer
    if (doubleClickTimers.current[id]) {
      clearTimeout(doubleClickTimers.current[id])
      delete doubleClickTimers.current[id]
      markDone(id)
    } else {
      doubleClickTimers.current[id] = setTimeout(() => {
        delete doubleClickTimers.current[id]
        // single click — do nothing, require double click
      }, 300)
    }
  }

  return (
    <div className="px-3 pb-3">
      {monthEvents.map((ev) => {
        const status = getTaskStatus(ev)
        const style = STATUS_STYLES[status]
        return (
          <div
            key={ev.id}
            className={`flex items-start gap-2 px-1 py-1.5 rounded-lg transition-colors cursor-pointer group select-none ${
              isDark ? 'hover:bg-white/5' : 'hover:bg-gray-200/50'
            }`}
            onClick={() => handleClick(ev.id)}
            title="Double-click to mark done"
          >
            {/* Checkbox */}
            <div className={`
              w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-200
              ${ev.done
                ? 'bg-green-600 border-green-600'
                : isDark ? 'border-white/20 bg-transparent group-hover:border-white/40' : 'border-gray-400 bg-transparent group-hover:border-gray-600'}
            `}>
              {ev.done && <Icon name="check" className="w-2.5 h-2.5 text-white" />}
            </div>

            {/* Title */}
            <span className={`text-[12px] leading-snug flex-1 transition-all duration-200 ${ev.done ? 'line-through text-gray-500 dark:text-gray-600' : isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              {ev.title}
              {ev.sub && <span className={isDark ? 'text-gray-400 text-[11px]' : 'text-gray-500 text-[11px]'}> ({ev.sub})</span>}
            </span>

            {/* Status pill */}
            <span className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full border leading-none flex-shrink-0 mt-0.5 uppercase tracking-wide ${style.pill}`}>
              {style.label}
            </span>
          </div>
        )
      })}

      <div className={`h-px my-2 ${isDark ? 'bg-white/[0.06]' : 'bg-gray-200'}`} />

      <button
        onClick={onAdd}
        className={`flex items-center gap-1.5 px-1 py-1.5 text-[12px] hover:text-accent transition-colors w-full rounded-lg ${isDark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-500 hover:bg-gray-200'}`}
      >
        <Icon name="plus" className="w-3 h-3" />
        Add new
      </button>

      <p className={`text-[10px] text-center mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Double-click to mark done</p>
    </div>
  )
}
