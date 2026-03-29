import React from 'react'
import { format } from 'date-fns'
import { useThemeColors } from '../../hooks/useThemeColors'

export default function DayPreviewPopup({ 
  date,           
  events,         
  position,       
  onClose,        
  onEventClick,   
  onViewDay       
}) {
  const dateLabel = format(date, 'EEEE, MMMM d')
  const hasEvents = events.length > 0
  const { getEventDotColor, isDark } = useThemeColors()

  return (
    <>
      {/* Backdrop to catch clicks outside */}
      <div 
        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]"
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose() }}
      />
      
      {/* Popup */}
      <div
        className="fixed z-50 w-[300px] max-h-[400px] rounded-xl shadow-2xl overflow-hidden animate-slide-down glass-panel"
        style={{
          left: Math.min(position.x, window.innerWidth - 320),
          top: Math.min(position.y, window.innerHeight - 420),
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[color:var(--theme-border)] flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-semibold theme-text-primary">
              {dateLabel}
            </h3>
            <p className="text-[11px] mt-0.5 theme-text-secondary">
              {events.length} {events.length === 1 ? 'event' : 'events'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors theme-icon-btn"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Event List */}
        <div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
          {!hasEvents ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px] theme-text-secondary">
                No events
              </p>
              <button
                onClick={onViewDay}
                className="mt-3 px-4 py-2 rounded-lg text-[12px] font-medium transition-colors theme-control theme-text-primary"
              >
                Add Event
              </button>
            </div>
          ) : (
            <div className="py-2">
              {events.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => {
                    onEventClick(ev)
                    onClose()
                  }}
                  className={`w-full px-4 py-2.5 flex items-start gap-3 hover:bg-white/20 dark:hover:bg-white/10 transition-colors text-left ${
                    ev.done ? 'opacity-60' : ''
                  }`}
                >
                  {/* Color indicator */}
                  <div 
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{
                      backgroundColor: getEventDotColor(ev.color),
                    }}
                  />
                  
                  {/* Event details */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-medium leading-tight theme-text-primary ${ev.done ? 'line-through' : ''}`}>
                      {ev.title}
                    </p>
                    <p className="text-[11px] mt-0.5 theme-text-secondary">
                      {ev.time}
                      {ev.sub && ` • ${ev.sub}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[color:var(--theme-border)]">
          <button
            onClick={onViewDay}
            className={`w-full px-4 py-2.5 rounded-lg text-[13px] font-medium transition-colors flex items-center justify-center gap-2 ${
              isDark
                ? 'bg-accent hover:opacity-90 text-white'
                : 'bg-[#9880cc] hover:opacity-90 text-white'
            }`}
          >
            View Day
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}
