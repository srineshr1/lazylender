import React, { useState } from 'react'
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors, rectIntersection,
} from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import { format } from 'date-fns'
import { useEventStore } from '../../store/useEventStore'
import {
  getWorkWeekDays, fmtDate, isToday, expandRecurring,
  timeToMinutes, minutesToTime, snapTo15,
} from '../../lib/dateUtils'
import DayColumn from './DayColumn'
import { Icon } from '../Icons'

const PX_PER_HOUR = 60
const TOTAL_HOURS = 24
const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => i)

export default function WeekView({ onEventClick, onSlotClick }) {
  const {
    events, currentWeekStart, prevWeek, nextWeek,
    searchQuery, reschedule,
    awakeStart, awakeEnd, setAwakeStart, setAwakeEnd,
  } = useEventStore()

  const days = getWorkWeekDays(currentWeekStart)
  const [draggingEv, setDraggingEv] = useState(null)
  const [slideDir, setSlideDir] = useState(null)
  const [animKey, setAnimKey] = useState(0)
  const [showSleepSettings, setShowSleepSettings] = useState(false)

  const expandedEvents = expandRecurring(events, days)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const navigate = (dir) => {
    setSlideDir(dir)
    setAnimKey((k) => k + 1)
    if (dir === 'left') prevWeek()
    else nextWeek()
    setTimeout(() => setSlideDir(null), 350)
  }

  const handleDragStart = ({ active }) => {
    setDraggingEv(active.data.current?.event || null)
  }

  const handleDragEnd = ({ active, over, delta }) => {
    setDraggingEv(null)
    if (!over) return
    const newDate = over.id
    const ev = events.find((e) => e.id === active.id) ||
      events.find((e) => active.id.startsWith(e.id))
    if (!ev) return
    const deltaMins = snapTo15(Math.round((delta.y / PX_PER_HOUR) * 60))
    const currentMins = timeToMinutes(ev.time)
    const newMins = Math.max(0, Math.min(23 * 60, currentMins + deltaMins))
    const newTime = minutesToTime(newMins)
    reschedule(ev._sourceId || ev.id, newDate, newTime)
  }

  const startDay = days[0]
  const endDay = days[days.length - 1]
  const rangeLabel = `${format(startDay, 'MMMM d')} – ${format(endDay, 'd')}`

  const slideClass = slideDir === 'left'
    ? 'animate-slideFromLeft'
    : slideDir === 'right'
    ? 'animate-slideFromRight'
    : ''

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Date range nav */}
      <div className="bg-white dark:bg-[#1f1d30] px-7 py-3 flex items-center gap-3 border-b border-black/[0.06] dark:border-white/10 flex-shrink-0">
        <button
          onClick={() => navigate('left')}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 dark:text-gray-400 hover:text-gray-700 transition-colors"
        >
          <Icon name="chevronLeft" className="w-4 h-4" />
        </button>
        <h2 className="font-display text-[22px] text-gray-800 dark:text-gray-100 tracking-tight min-w-[200px]">
          {rangeLabel}
        </h2>
        <button
          onClick={() => navigate('right')}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 dark:text-gray-400 hover:text-gray-700 transition-colors"
        >
          <Icon name="chevronRight" className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        {/* Sleep zone settings toggle */}
        <button
          onClick={() => setShowSleepSettings((v) => !v)}
          className={`flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border transition-all ${
            showSleepSettings
              ? 'bg-sidebar-deep text-white border-sidebar-deep'
              : 'text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600'
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
          </svg>
          Sleep zone
        </button>
      </div>

      {/* Sleep zone settings bar */}
      {showSleepSettings && (
        <div className="bg-[#fafaf8] border-b border-black/[0.06] px-7 py-2.5 flex items-center gap-6 text-[12.5px] text-gray-500 animate-fadeUp">
          <span className="font-medium text-gray-600">Awake hours</span>
          <div className="flex items-center gap-2">
            <label className="text-gray-400">From</label>
            <select
              className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[12px] text-gray-700 outline-none focus:border-accent transition-colors"
              value={awakeStart}
              onChange={(e) => setAwakeStart(Number(e.target.value))}
            >
              {Array.from({ length: 13 }, (_, i) => i).map((h) => (
                <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
              ))}
            </select>
            <label className="text-gray-400">To</label>
            <select
              className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[12px] text-gray-700 outline-none focus:border-accent transition-colors"
              value={awakeEnd}
              onChange={(e) => setAwakeEnd(Number(e.target.value))}
            >
              {Array.from({ length: 13 }, (_, i) => i + 12).map((h) => (
                <option key={h} value={h}>{h === 24 ? '00:00 (midnight)' : `${String(h).padStart(2, '0')}:00`}</option>
              ))}
            </select>
          </div>
          <span className="text-gray-400 text-[11px]">Greyed areas = sleep time · changes saved automatically</span>
        </div>
      )}

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto light-scroll overflow-x-hidden min-w-0">
        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToWindowEdges]}
        >
          <div key={animKey} className={slideClass} style={{ willChange: 'transform, opacity' }}>
            {/* Week header */}
            <div
              className="grid sticky top-0 z-20 bg-white dark:bg-[#1f1d30] border-b border-black/[0.06] dark:border-white/10"
              style={{ gridTemplateColumns: '56px repeat(5, 1fr)' }}
            >
              <div className="px-2 py-3" />
              {days.map((d) => {
                const today = isToday(d)
                return (
                  <div key={fmtDate(d)} className="py-3 text-center">
                    <span className={`
                      text-[26px] font-light leading-none font-display
                      ${today
                        ? 'bg-sidebar-deep dark:bg-[#e8e4f8] text-white dark:text-[#1a1a2e] w-10 h-10 rounded-full inline-flex items-center justify-center text-[18px]'
                        : 'text-gray-600 dark:text-gray-200 block'}
                    `}>
                      {d.getDate()}
                    </span>
                    <span className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-300 mt-1 block">
                      {format(d, 'EEE')}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Body */}
            <div className="grid" style={{ gridTemplateColumns: '56px repeat(5, 1fr)' }}>
              {/* Time gutter — full 24hr */}
              <div>
                {HOURS.map((h) => (
                  <div key={h} className="relative" style={{ height: PX_PER_HOUR }}>
                    <span className={`absolute -top-2 right-2 text-[11px] tabular-nums ${
                      h >= awakeStart && h < awakeEnd ? 'text-gray-500 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {String(h).padStart(2, '0')}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {days.map((d) => {
                const dateStr = fmtDate(d)
                const dayEvs = expandedEvents.filter((e) => e.date === dateStr)
                return (
                  <DayColumn
                    key={dateStr}
                    date={d}
                    events={dayEvs}
                    searchQuery={searchQuery}
                    onEventClick={onEventClick}
                    onSlotClick={onSlotClick}
                    awakeStart={awakeStart}
                    awakeEnd={awakeEnd}
                  />
                )
              })}
            </div>
          </div>

          <DragOverlay>
            {draggingEv && (
              <div className="bg-accent/20 border-2 border-accent border-dashed rounded-lg px-2 py-1.5 w-32 opacity-80">
                <p className="text-[12px] font-medium text-accent truncate">{draggingEv.title}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
