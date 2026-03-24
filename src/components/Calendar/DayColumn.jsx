import React, { memo, useMemo, useCallback } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useDarkStore } from '../../store/useDarkStore'
import { fmtDate, isToday, timeToMinutes } from '../../lib/dateUtils'
import { PX_PER_HOUR, TOTAL_HOURS, SNAP_INTERVAL_MINUTES, DEFAULT_EVENT_DURATION } from '../../lib/constants'
import EventBlock from './EventBlock'

// Memoized hour cells to avoid recreating on every render
const HourCells = memo(function HourCells() {
  return (
    <>
      {Array.from({ length: TOTAL_HOURS }, (_, i) => (
        <div
          key={i}
          className="border-b border-black/[0.04] dark:border-white/[0.04]"
          style={{ height: PX_PER_HOUR }}
        />
      ))}
    </>
  )
})

// Memoized sleep zone component
const SleepZone = memo(function SleepZone({ type, hours, awakeEnd }) {
  if (hours <= 0) return null
  
  if (type === 'top') {
    return (
      <div
        className="absolute left-0 right-0 top-0 pointer-events-none z-[2]"
        style={{ height: hours * PX_PER_HOUR }}
      >
        <div className="w-full h-full bg-black/[0.06] dark:bg-white/[0.03]" />
        <div className="absolute bottom-0 left-0 right-0 border-b-2 border-dashed border-black/[0.12] dark:border-white/[0.10]" />
      </div>
    )
  }
  
  return (
    <div
      className="absolute left-0 right-0 pointer-events-none z-[2]"
      style={{
        top: awakeEnd * PX_PER_HOUR,
        height: hours * PX_PER_HOUR,
      }}
    >
      <div className="absolute top-0 left-0 right-0 border-t-2 border-dashed border-black/[0.12] dark:border-white/[0.10]" />
      <div className="w-full h-full bg-black/[0.06] dark:bg-white/[0.03]" />
    </div>
  )
})

// Memoized now line component
const NowLine = memo(function NowLine({ nowMins }) {
  return (
    <div
      className="absolute left-0 right-0 flex items-center pointer-events-none z-10"
      style={{ top: (nowMins / 60) * PX_PER_HOUR }}
    >
      <div className="w-2.5 h-2.5 rounded-full bg-red-500 dark:bg-red-400 -ml-1.5 flex-shrink-0" />
      <div className="flex-1 h-[1.5px] bg-red-500 dark:bg-red-400" />
    </div>
  )
})

function DayColumn({ date, events, searchQuery, onEventClick, onSlotClick, awakeStart, awakeEnd, getEventOpacity }) {
  const dateStr = useMemo(() => fmtDate(date), [date])
  const todayCol = useMemo(() => isToday(date), [date])

  const { setNodeRef, isOver } = useDroppable({ id: dateStr, data: { date: dateStr } })

  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const showNow = todayCol && nowMins >= 0 && nowMins <= TOTAL_HOURS * 60

  // Sleep zones: 00:00 → awakeStart and awakeEnd → 24:00
  const sleepTopZoneH = awakeStart
  const sleepBottomZoneH = TOTAL_HOURS - awakeEnd

  const handleDoubleClick = useCallback((e) => {
    if (e.target.closest('.event-block')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const relY = e.clientY - rect.top
    const totalMins = Math.round(relY / PX_PER_HOUR * 60 / 15) * 15
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    const time = `${String(Math.min(h, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    onSlotClick(dateStr, time)
  }, [dateStr, onSlotClick])

  return (
    <div
      ref={setNodeRef}
      className={`border-l border-black/[0.06] dark:border-white/[0.06] relative ${
        isOver ? 'bg-blue-500/10 dark:bg-blue-400/15' : ''
      } transition-all duration-200`}
      style={{ height: TOTAL_HOURS * PX_PER_HOUR }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Hour cells */}
      <HourCells />

      {/* Sleep zone top: 00:00 → awakeStart */}
      <SleepZone type="top" hours={sleepTopZoneH} />

      {/* Sleep zone bottom: awakeEnd → 24:00 */}
      <SleepZone type="bottom" hours={sleepBottomZoneH} awakeEnd={awakeEnd} />

      {/* Now line */}
      {showNow && <NowLine nowMins={nowMins} />}

      {/* Events */}
      {events.map((ev) => {
        const mins = timeToMinutes(ev.time)
        if (mins < 0 || mins >= TOTAL_HOURS * 60) return null
        const topPx = (mins / 60) * PX_PER_HOUR
        const heightPx = ((ev.duration || DEFAULT_EVENT_DURATION) / 60) * PX_PER_HOUR - 4
        const dimmed = !!searchQuery && !ev.title.toLowerCase().includes(searchQuery.toLowerCase())
        const opacity = getEventOpacity ? getEventOpacity(ev) : 1
        return (
          <EventBlock
            key={ev.id}
            event={ev}
            topPx={topPx}
            heightPx={heightPx}
            dimmed={dimmed}
            opacity={opacity}
            onClick={onEventClick}
          />
        )
      })}
    </div>
  )
}

// Custom comparison for DayColumn
function areEqual(prevProps, nextProps) {
  // Check primitive props
  if (
    prevProps.searchQuery !== nextProps.searchQuery ||
    prevProps.awakeStart !== nextProps.awakeStart ||
    prevProps.awakeEnd !== nextProps.awakeEnd ||
    prevProps.date.getTime() !== nextProps.date.getTime()
  ) {
    return false
  }
  
  // Check events array (shallow comparison of ids and key properties)
  if (prevProps.events.length !== nextProps.events.length) return false
  
  for (let i = 0; i < prevProps.events.length; i++) {
    const prev = prevProps.events[i]
    const next = nextProps.events[i]
    if (
      prev.id !== next.id ||
      prev.title !== next.title ||
      prev.time !== next.time ||
      prev.duration !== next.duration ||
      prev.done !== next.done ||
      prev.color !== next.color
    ) {
      return false
    }
  }
  
  return true
}

export default memo(DayColumn, areEqual)
