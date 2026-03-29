import React, { useState } from 'react'
import { format, addMonths, subMonths, isSameMonth, isToday as fnsIsToday } from 'date-fns'
import { useEventStore } from '../../store/useEventStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useThemeColors } from '../../hooks/useThemeColors'
import { getMonthDays, fmtDate } from '../../lib/dateUtils'
import { Icon } from '../Icons'
import DayPreviewPopup from './DayPreviewPopup'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function MonthView({ onEventClick, onSlotClick, onNavigateToDay }) {
  const { events, searchQuery } = useEventStore()
  const { showPastEvents } = useSettingsStore()
  const { getEventDotColor } = useThemeColors()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [slideDir, setSlideDir] = useState(null)
  const [animKey, setAnimKey] = useState(0)
  const [selectedDay, setSelectedDay] = useState(null)
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })

  const days = getMonthDays(currentMonth)
  
  // Check if event is in the past and should be dimmed
  const isEventPast = (ev) => {
    const now = new Date()
    const eventDateTime = new Date(`${ev.date}T${ev.time}`)
    return eventDateTime < now
  }

  // Apply dimming to past events based on showPastEvents setting
  const getEventOpacity = (ev) => {
    if (ev.done) return 0.5  // Completed events are always dimmed
    if (!showPastEvents && isEventPast(ev)) return 0.4  // Past events dimmed if setting is off
    return 1
  }

  const navigate = (dir) => {
    setSlideDir(dir)
    setAnimKey((k) => k + 1)
    if (dir === 'left') setCurrentMonth(d => subMonths(d, 1))
    else setCurrentMonth(d => addMonths(d, 1))
    setTimeout(() => setSlideDir(null), 350)
  }

  // Get events for a specific date
  const getEventsForDate = (date) => {
    const dateStr = fmtDate(date)
    return events.filter(ev => {
      // Filter by search query if present
      if (searchQuery && !ev.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      
      // Check direct date match
      if (ev.date === dateStr) return true
      
      // Check recurring events
      if (ev.recurrence !== 'none' && ev.date <= dateStr) {
        if (ev.recurrenceEnd && ev.recurrenceEnd < dateStr) return false
        
        // Simple recurrence check (this could be more sophisticated)
        const startDate = new Date(ev.date)
        const checkDate = new Date(dateStr)
        const diffDays = Math.floor((checkDate - startDate) / (1000 * 60 * 60 * 24))
        
        if (ev.recurrence === 'daily') return true
        if (ev.recurrence === 'weekly') return diffDays % 7 === 0
        if (ev.recurrence === 'monthly') {
          return startDate.getDate() === checkDate.getDate()
        }
      }
      
      return false
    })
  }

  // Single click - show day preview popup
  const handleDayClick = (date, event) => {
    event.stopPropagation()
    
    // Get click position
    const rect = event.currentTarget.getBoundingClientRect()
    setPopupPosition({
      x: rect.left,
      y: rect.bottom + 8
    })
    
    // Get events for this day
    const dayEvents = getEventsForDate(date)
    setSelectedDay({ date, events: dayEvents })
  }

  // Double click - navigate to day view
  const handleDayDoubleClick = (date) => {
    setSelectedDay(null)
    if (onNavigateToDay) {
      onNavigateToDay(date)
    }
  }

  // Close popup
  const closePopup = () => {
    setSelectedDay(null)
  }

  // Navigate to day view
  const navigateToDay = (date) => {
    handleDayDoubleClick(date)
  }

  const monthLabel = format(currentMonth, 'MMMM yyyy')

  const slideClass = slideDir === 'left'
    ? 'animate-slideFromLeft'
    : slideDir === 'right'
    ? 'animate-slideFromRight'
    : ''

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Month navigation */}
      <div className="px-7 py-3 flex items-center gap-3 border-b border-[color:var(--theme-border)] flex-shrink-0 glass-subtle">
        <button
          onClick={() => navigate('left')}
          className="w-7 h-7 rounded-lg flex items-center justify-center theme-icon-btn"
        >
          <Icon name="chevronLeft" className="w-4 h-4" />
        </button>
        <h2 className="font-display text-[22px] theme-text-primary tracking-tight min-w-[200px]">
          {monthLabel}
        </h2>
        <button
          onClick={() => navigate('right')}
          className="w-7 h-7 rounded-lg flex items-center justify-center theme-icon-btn"
        >
          <Icon name="chevronRight" className="w-4 h-4" />
        </button>

        <button
          onClick={() => setCurrentMonth(new Date())}
          className="ml-2 px-3 py-1.5 rounded-lg text-[12.5px] font-medium theme-text-secondary theme-hover-text hover:bg-black/5 transition-colors"
        >
          Today
        </button>

        <div className="flex-1" />
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-hidden p-6" style={{ background: 'color-mix(in srgb, var(--theme-surface-alt) 72%, transparent)' }}>
        <div className="h-full flex flex-col" key={animKey}>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-px mb-2">
            {WEEKDAYS.map(day => (
              <div
                key={day}
                className="text-center text-[11px] font-semibold theme-text-secondary uppercase tracking-wider py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className={`flex-1 grid grid-cols-7 gap-px rounded-lg overflow-hidden ${slideClass}`} style={{ backgroundColor: 'color-mix(in srgb, var(--theme-border) 85%, transparent)' }}>
            {days.map((date, idx) => {
              const dateStr = fmtDate(date)
              const isCurrentMonth = isSameMonth(date, currentMonth)
              const isToday = fnsIsToday(date)
              const dayEvents = getEventsForDate(date)
              const hasEvents = dayEvents.length > 0

              return (
                <button
                  key={idx}
                  onClick={(e) => handleDayClick(date, e)}
                  onDoubleClick={() => handleDayDoubleClick(date)}
                  className={`
                    p-2 flex flex-col items-center justify-start
                    hover:bg-black/5 transition-colors glass-subtle
                    ${!isCurrentMonth ? 'opacity-30' : ''}
                    ${isToday ? 'ring-2 ring-blue-500 ring-inset' : ''}
                  `}
                >
                  {/* Day number */}
                  <div className={`
                    text-[13px] font-medium mb-1
                    ${isToday
                      ? 'bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center'
                      : isCurrentMonth
                        ? 'theme-text-primary'
                        : 'theme-text-secondary opacity-55'
                    }
                  `}>
                    {format(date, 'd')}
                  </div>

                  {/* Event dots */}
                  {hasEvents && (
                    <div className="flex flex-wrap gap-1 justify-center mt-1">
                      {dayEvents.slice(0, 3).map((ev, i) => {
                        const eventOpacity = getEventOpacity(ev)
                        return (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              backgroundColor: getEventDotColor(ev.color),
                              opacity: eventOpacity,
                            }}
                            title={ev.title}
                          />
                        )
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-[9px] theme-text-secondary font-medium">
                          +{dayEvents.length - 3}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Event count on hover */}
                  {hasEvents && (
                    <div className="text-[10px] theme-text-secondary mt-1">
                      {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Day Preview Popup */}
      {selectedDay && (
        <DayPreviewPopup
          date={selectedDay.date}
          events={selectedDay.events}
          position={popupPosition}
          onClose={closePopup}
          onEventClick={onEventClick}
          onViewDay={navigateToDay}
        />
      )}
    </div>
  )
}
