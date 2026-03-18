import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import EventBlock from './EventBlock'
import { fmtDate, isToday, timeToMinutes } from '../../lib/dateUtils'

const PX_PER_HOUR = 60
const TOTAL_HOURS = 24 // full 24hr clock

export default function DayColumn({ date, events, searchQuery, onEventClick, onSlotClick, awakeStart, awakeEnd }) {
  const dateStr = fmtDate(date)
  const todayCol = isToday(date)

  const { setNodeRef, isOver } = useDroppable({ id: dateStr, data: { date: dateStr } })

  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const showNow = todayCol && nowMins >= 0 && nowMins <= TOTAL_HOURS * 60

  // Sleep zones: 00:00 → awakeStart and awakeEnd → 24:00
  const sleepTopZoneH = awakeStart                    // hours from 0
  const sleepBottomZoneH = TOTAL_HOURS - awakeEnd     // hours from awakeEnd to 24

  return (
    <div
      ref={setNodeRef}
      className={`border-l border-black/[0.06] dark:border-white/[0.06] relative ${isOver ? 'bg-accent/5' : ''} transition-colors`}
      style={{ height: TOTAL_HOURS * PX_PER_HOUR }}
      onDoubleClick={(e) => {
        if (e.target.closest('.event-block')) return
        const rect = e.currentTarget.getBoundingClientRect()
        const relY = e.clientY - rect.top
        const totalMins = Math.round(relY / PX_PER_HOUR * 60 / 15) * 15
        const h = Math.floor(totalMins / 60)
        const m = totalMins % 60
        const time = `${String(Math.min(h, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        onSlotClick(dateStr, time)
      }}
    >
      {/* Hour cells */}
      {Array.from({ length: TOTAL_HOURS }, (_, i) => (
        <div
          key={i}
          className="border-b border-black/[0.04] dark:border-white/[0.04]"
          style={{ height: PX_PER_HOUR }}
        />
      ))}

      {/* Sleep zone top: 00:00 → awakeStart */}
      {sleepTopZoneH > 0 && (
        <div
          className="absolute left-0 right-0 top-0 pointer-events-none z-[2]"
          style={{ height: sleepTopZoneH * PX_PER_HOUR }}
        >
          <div className="w-full h-full bg-black/[0.035] dark:bg-white/[0.03]" />
          {/* Faint border at awakeStart */}
          <div className="absolute bottom-0 left-0 right-0 border-b-2 border-dashed border-black/[0.12] dark:border-white/[0.10]" />
        </div>
      )}

      {/* Sleep zone bottom: awakeEnd → 24:00 */}
      {sleepBottomZoneH > 0 && (
        <div
          className="absolute left-0 right-0 pointer-events-none z-[2]"
          style={{
            top: awakeEnd * PX_PER_HOUR,
            height: sleepBottomZoneH * PX_PER_HOUR,
          }}
        >
          {/* Faint border at awakeEnd */}
          <div className="absolute top-0 left-0 right-0 border-t-2 border-dashed border-black/[0.12] dark:border-white/[0.10]" />
          <div className="w-full h-full bg-black/[0.035] dark:bg-white/[0.03]" />
        </div>
      )}

      {/* Now line */}
      {showNow && (
        <div
          className="absolute left-0 right-0 flex items-center pointer-events-none z-10"
          style={{ top: (nowMins / 60) * PX_PER_HOUR }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 dark:bg-red-400 -ml-1.5 flex-shrink-0" />
          <div className="flex-1 h-[1.5px] bg-red-500 dark:bg-red-400" />
        </div>
      )}

      {/* Events */}
      {events.map((ev) => {
        const mins = timeToMinutes(ev.time)
        if (mins < 0 || mins >= TOTAL_HOURS * 60) return null
        const topPx = (mins / 60) * PX_PER_HOUR
        const heightPx = ((ev.duration || 60) / 60) * PX_PER_HOUR - 4
        const dimmed = !!searchQuery && !ev.title.toLowerCase().includes(searchQuery.toLowerCase())
        return (
          <EventBlock
            key={ev.id}
            event={ev}
            topPx={topPx}
            heightPx={heightPx}
            dimmed={dimmed}
            onClick={onEventClick}
          />
        )
      })}
    </div>
  )
}
