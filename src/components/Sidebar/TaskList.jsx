import React, { useRef } from 'react'
import { useEventStore, getTaskStatus } from '../../store/useEventStore'
import { isSameMonth } from 'date-fns'
import { parseDate } from '../../lib/dateUtils'
import { Icon } from '../Icons'

export default function TaskList({ onAdd }) {
  const { events, markDone } = useEventStore()
  const now = new Date()
  const doubleClickTimers = useRef({})

  const monthEvents = events
    .filter(e => isSameMonth(parseDate(e.date), now) && !e.cancelled)
    .slice(0, 8)

  const handleClick = (id) => {
    if (doubleClickTimers.current[id]) {
      clearTimeout(doubleClickTimers.current[id])
      delete doubleClickTimers.current[id]
      markDone(id)
    } else {
      doubleClickTimers.current[id] = setTimeout(() => {
        delete doubleClickTimers.current[id]
      }, 300)
    }
  }

  return (
    <div className="pb-1">
      {monthEvents.map((ev, i) => {
        const status = getTaskStatus(ev)
        return (
          <div
            key={ev.id}
            className="task-item flex items-start gap-2 px-1 py-1.5 rounded-lg cursor-pointer select-none group"
            style={{ animationDelay: `${i * 25}ms` }}
            onClick={() => handleClick(ev.id)}
            title="Double-click to mark done"
          >
            {/* Checkbox */}
            <div className={`
              task-checkbox w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-200
              ${ev.done ? 'task-checkbox--done' : 'task-checkbox--idle'}
            `}>
              {ev.done && <Icon name="check" className="w-2.5 h-2.5 text-white" />}
            </div>

            {/* Title */}
            <span className={`task-title text-[12px] leading-snug flex-1 transition-all duration-200 ${ev.done ? 'line-through task-title--done' : ''}`}>
              {ev.title}
              {ev.sub && <span className="task-sub text-[11px]"> ({ev.sub})</span>}
            </span>

            {/* Status pill */}
            <span className={`task-pill task-pill--${status} text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full border leading-none flex-shrink-0 mt-0.5 uppercase tracking-wide`}>
              {status}
            </span>
          </div>
        )
      })}

      <div className="sidebar-divider h-px my-2 mx-1" />

      <button
        onClick={onAdd}
        className="task-add-btn flex items-center gap-1.5 px-1 py-1.5 text-[12px] transition-colors w-full rounded-lg"
      >
        <Icon name="plus" className="w-3 h-3" />
        Add new
      </button>

      <p className="task-hint text-[10px] text-center mt-1">Double-click to mark done</p>
    </div>
  )
}
