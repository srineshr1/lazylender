import React, { useState, useMemo, useCallback } from 'react'
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors, closestCenter,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import { format } from 'date-fns'
import { useEventStore } from '../../store/useEventStore'
import { useDarkStore } from '../../store/useDarkStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import {
  getFullWeekDays, fmtDate, isToday, expandRecurring,
  timeToMinutes, minutesToTime, snapTo15,
} from '../../lib/dateUtils'
import { PX_PER_HOUR, TOTAL_HOURS, SNAP_INTERVAL_MINUTES } from '../../lib/constants'
import DayColumn from './DayColumn'
import { Icon } from '../Icons'

const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => i)

export default function WeekView({ onEventClick, onSlotClick }) {
  const {
    events, currentWeekStart, prevWeek, nextWeek,
    searchQuery, reschedule,
    awakeStart, awakeEnd, setAwakeStart, setAwakeEnd,
  } = useEventStore()
  const { isDark } = useDarkStore()
  const { showPastEvents } = useSettingsStore()

  const days = useMemo(() => getFullWeekDays(currentWeekStart), [currentWeekStart])
  const [draggingEv, setDraggingEv] = useState(null)
  const [slideDir, setSlideDir] = useState(null)
  const [animKey, setAnimKey] = useState(0)
  const [showSleepSettings, setShowSleepSettings] = useState(false)

  const expandedEvents = useMemo(() => expandRecurring(events, days), [events, days])
  
  // Memoized function to check if event is in the past
  const isEventPast = useCallback((ev) => {
    const now = new Date()
    const eventDateTime = new Date(`${ev.date}T${ev.time}`)
    return eventDateTime < now
  }, [])

  // Memoized function to get event opacity
  const getEventOpacity = useCallback((ev) => {
    if (ev.done) return 0.5  // Completed events are always dimmed
    if (!showPastEvents && isEventPast(ev)) return 0.4  // Past events dimmed if setting is off
    return 1
  }, [showPastEvents, isEventPast])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const navigate = useCallback((dir) => {
    setSlideDir(dir)
    setAnimKey((k) => k + 1)
    if (dir === 'left') prevWeek()
    else nextWeek()
    setTimeout(() => setSlideDir(null), 350)
  }, [prevWeek, nextWeek])

  const handleDragStart = useCallback(({ active }) => {
    setDraggingEv(active.data.current?.event || null)
  }, [])

  const handleDragEnd = useCallback(({ active, over, delta }) => {
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
  }, [events, reschedule])

  const startDay = days[0]
  const endDay = days[days.length - 1]
  const rangeLabel = useMemo(() => 
    `${format(startDay, 'MMMM d')} – ${format(endDay, 'd')}`,
    [startDay, endDay]
  )

  const slideClass = slideDir === 'left'
    ? 'animate-slideFromLeft'
    : slideDir === 'right'
    ? 'animate-slideFromRight'
    : ''

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Date range nav */}
      <div className="px-7 py-3 flex items-center gap-3 border-b border-light-border dark:border-white/10 flex-shrink-0" style={{ backgroundColor: isDark ? '#1f1d30' : '#faf9f7' }}>
        <button
          onClick={() => navigate('left')}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-light-text-secondary hover:bg-light-card dark:hover:bg-white/10 dark:text-gray-400 hover:text-light-text transition-colors"
        >
          <Icon name="chevronLeft" className="w-4 h-4" />
        </button>
        <h2 className="font-display text-[22px] text-light-text dark:text-gray-100 tracking-tight min-w-[200px]">
          {rangeLabel}
        </h2>
        <button
          onClick={() => navigate('right')}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-light-text-secondary hover:bg-light-card dark:hover:bg-white/10 dark:text-gray-400 hover:text-light-text transition-colors"
        >
          <Icon name="chevronRight" className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        {/* Sleep zone settings toggle */}
        <button
          onClick={() => setShowSleepSettings((v) => !v)}
          className={`flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border transition-all ${
            showSleepSettings
              ? 'bg-sidebar-deep text-white border-sidebar-deep dark:bg-sidebar-deep'
              : 'text-light-text-secondary border-light-border hover:border-light-text-secondary hover:text-light-text'
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
        <div className="border-b border-light-border px-7 py-2.5 flex items-center gap-6 text-[12.5px] text-light-text-secondary animate-fadeUp" style={{ backgroundColor: '#fafaf8' }}>
          <span className="font-medium text-light-text">Awake hours</span>
          <div className="flex items-center gap-2">
            <label className="text-light-text-secondary">From</label>
            <select
              className="border border-light-border rounded-lg px-2 py-1 text-[12px] text-light-text outline-none focus:border-accent transition-colors"
              style={{ backgroundColor: '#faf9f7' }}
              value={awakeStart}
              onChange={(e) => setAwakeStart(Number(e.target.value))}
            >
              {Array.from({ length: 13 }, (_, i) => i).map((h) => (
                <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
              ))}
            </select>
            <label className="text-light-text-secondary">To</label>
            <select
              className="border border-light-border rounded-lg px-2 py-1 text-[12px] text-light-text outline-none focus:border-accent transition-colors"
              style={{ backgroundColor: '#faf9f7' }}
              value={awakeEnd}
              onChange={(e) => setAwakeEnd(Number(e.target.value))}
            >
              {Array.from({ length: 13 }, (_, i) => i + 12).map((h) => (
                <option key={h} value={h}>{h === 24 ? '00:00 (midnight)' : `${String(h).padStart(2, '0')}:00`}</option>
              ))}
            </select>
          </div>
          <span className="text-light-text-secondary text-[11px]">Greyed areas = sleep time · changes saved automatically</span>
        </div>
      )}

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto light-scroll overflow-x-hidden min-w-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToWindowEdges]}
        >
          <div key={animKey} className={slideClass} style={{ willChange: 'transform, opacity' }}>
            {/* Week header */}
            <div
              className="grid sticky top-0 z-20 border-b dark:border-white/10"
              style={{ 
                gridTemplateColumns: '56px repeat(7, 1fr)',
                backgroundColor: isDark ? '#1f1d30' : '#faf9f7',
                boxShadow: isDark ? undefined : '0 1px 0 rgba(0,0,0,0.06)'
              }}
            >
              <div className="px-2 py-3" />
              {days.map((d) => {
                const today = isToday(d)
                return (
                  <div key={fmtDate(d)} className="py-3 text-center">
                    <span className={`
                      text-[26px] font-light leading-none font-display
                      ${today
                        ? 'dark:bg-[#e8e4f8] text-white dark:text-[#1a1a2e] w-10 h-10 rounded-full inline-flex items-center justify-center text-[18px]'
                        : 'text-light-text dark:text-gray-200 block'}
                    `} style={today && !isDark ? { backgroundColor: '#9880cc', color: 'white' } : {}}>
                      {d.getDate()}
                    </span>
                    <span className="text-[11px] uppercase tracking-wide text-light-text-secondary dark:text-gray-300 mt-1 block">
                      {format(d, 'EEE')}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Body */}
            <div className="grid" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
              {/* Time gutter — full 24hr */}
              <div style={{ backgroundColor: isDark ? undefined : '#f0ede8' }}>
                {HOURS.map((h) => (
                  <div key={h} className="relative" style={{ height: PX_PER_HOUR }}>
                    <span className={`absolute -top-2 right-2 text-[11px] tabular-nums ${
                      h >= awakeStart && h < awakeEnd ? 'text-light-text-secondary dark:text-gray-300' : 'text-light-text-secondary/60 dark:text-gray-500'
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
                    getEventOpacity={getEventOpacity}
                  />
                )
              })}
            </div>
          </div>

          <DragOverlay dropAnimation={null}>
            {draggingEv && (() => {
              const COLOR_MAP = {
                pink:  { bg: 'bg-event-pink dark:bg-[#3d2040]',  border: '#c060d0', text: '#4a1259', darkText: '#f5d8f8' },
                green: { bg: 'bg-event-green dark:bg-[#1a3d28]', border: '#2a9e5a', text: '#0d4a22', darkText: '#c8f0d8' },
                blue:  { bg: 'bg-event-blue dark:bg-[#1a2d4a]',  border: '#3070c8', text: '#082d5e', darkText: '#c8dcf5' },
                amber: { bg: 'bg-event-amber dark:bg-[#3d2e10]', border: '#c87820', text: '#522c05', darkText: '#f5e8c0' },
                gray:  { bg: 'bg-event-gray dark:bg-[#2a2a2a]',  border: '#888888', text: '#222222', darkText: '#e0e0e0' },
              }
              const colorScheme = COLOR_MAP[draggingEv.color] || COLOR_MAP.gray
              const titleColor = isDark ? colorScheme.darkText : colorScheme.text
              
              return (
                <div 
                  className={`rounded-lg px-2 py-1.5 overflow-hidden select-none ${colorScheme.bg}`}
                  style={{
                    transform: 'rotate(-2deg) scale(1.05)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.4), 0 10px 20px rgba(0,0,0,0.25)',
                    borderRadius: '8px',
                    width: '120px',
                    borderLeft: `4px solid ${colorScheme.border}`,
                    cursor: 'grabbing',
                    willChange: 'transform, box-shadow',
                  }}
                >
                  <div className="relative">
                    <p 
                      className={`text-[13px] font-semibold leading-tight ${draggingEv.done ? 'line-through opacity-50' : ''}`}
                      style={{ color: titleColor }}
                    >
                      {draggingEv.title}
                    </p>
                    {draggingEv.sub && (
                      <p className="text-[11px] mt-0.5 truncate text-light-text-secondary dark:text-gray-400">{draggingEv.sub}</p>
                    )}
                  </div>
                </div>
              )
            })()}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
