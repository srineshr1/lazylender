import React, { useState, useMemo, useCallback, useId } from 'react'
import TaskList from './TaskList'
import MiniCalendar from './MiniCalendar'
import { Icon } from '../Icons'
import { useDarkStore } from '../../store/useDarkStore'
import { useEventStore } from '../../store/useEventStore'
import { fmtDate } from '../../lib/dateUtils'
import { getEventAriaLabel } from '../../lib/accessibility'

export default function Sidebar({ onAddEvent }) {
  const [todayOpen, setTodayOpen] = useState(true)
  const [thisMonthOpen, setThisMonthOpen] = useState(true)
  const [notesOpen, setNotesOpen] = useState(false)
  const { isDark } = useDarkStore()
  const { events, markDone } = useEventStore()
  
  // Generate unique IDs for ARIA relationships
  const todayPanelId = useId()
  const monthPanelId = useId()
  const notesPanelId = useId()
  const notesLabelId = useId()

  // Filter and sort today's events
  const todayEvents = useMemo(() => {
    const todayDate = fmtDate(new Date())
    return events
      .filter(ev => ev.date === todayDate && !ev.cancelled)
      .sort((a, b) => a.time.localeCompare(b.time))
  }, [events])

  const completedCount = todayEvents.filter(ev => ev.done).length
  const totalCount = todayEvents.length

  return (
    <aside 
      className={`w-[260px] min-w-[260px] md:w-[260px] md:min-w-[260px] flex-shrink-0 flex flex-col border-r overflow-y-auto h-full ${
        isDark ? 'bg-sidebar' : 'bg-light-card border-light-border'
      }`}
      role="complementary"
      aria-label="Sidebar navigation"
    >
      {/* Logo */}
      <div className="px-5 pt-7 pb-5 flex items-center justify-between flex-shrink-0">
        <span className={`font-display text-[22px] tracking-tight ${isDark ? 'text-gray-100' : 'text-light-text'}`} aria-hidden="true">my.calendar</span>
      </div>

      {/* Today section */}
      <section 
        className={`mx-3 mb-2 rounded-xl overflow-hidden ${isDark ? 'bg-white/[0.04]' : 'bg-light-bg'}`}
        aria-labelledby={`${todayPanelId}-heading`}
      >
        <button
          id={`${todayPanelId}-heading`}
          className={`w-full flex items-center justify-between px-3.5 py-3 text-[13px] font-medium transition-colors border-b ${isDark ? 'text-gray-200 hover:bg-white/[0.04] border-transparent' : 'text-light-text hover:bg-light-card border-light-border'}`}
          onClick={() => setTodayOpen((v) => !v)}
          aria-expanded={todayOpen}
          aria-controls={todayPanelId}
        >
          <span>
            Today
            {totalCount > 0 && (
              <span className={`ml-2 ${isDark ? 'text-gray-500' : 'text-light-text-secondary'}`}>
                • {completedCount}/{totalCount} completed
              </span>
            )}
          </span>
          <Icon
            name={todayOpen ? 'minus' : 'plus'}
            className={`w-3.5 h-3.5 ${isDark ? 'text-gray-500' : 'text-light-text-secondary'}`}
            aria-hidden="true"
          />
        </button>
        {todayOpen && (
          <div id={todayPanelId} className="px-3 pb-3 pt-2" role="region">
            {todayEvents.length === 0 ? (
              <p className={`text-xs py-3 text-center ${isDark ? 'text-gray-600' : 'text-light-text-secondary'}`}>
                No events today
              </p>
            ) : (
              <ul className="space-y-2" role="list" aria-label="Today's events">
                {todayEvents.map((event) => (
                  <li
                    key={event.id}
                    className={`flex items-start gap-2.5 py-1.5 transition-opacity ${
                      event.done ? 'opacity-60' : 'opacity-100'
                    }`}
                  >
                    <button
                      onClick={() => markDone(event.id)}
                      className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center mt-0.5 transition-all ${
                        event.done
                          ? 'bg-accent border-accent'
                          : isDark
                          ? 'border-white/20 hover:border-accent/50'
                          : 'border-light-text-secondary hover:border-accent/50'
                      }`}
                      role="checkbox"
                      aria-checked={event.done}
                      aria-label={`${event.title}: ${event.done ? 'Mark as incomplete' : 'Mark as complete'}`}
                    >
                      {event.done && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13px] ${event.done ? 'line-through' : ''} ${isDark ? 'text-gray-300' : 'text-light-text'}`}>
                        {event.title}
                      </div>
                      <div className={`text-[11px] mt-0.5 ${isDark ? 'text-gray-600' : 'text-light-text-secondary'}`}>
                        {event.time}
                        {event.sub && ` • ${event.sub}`}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* This month section */}
      <section 
        className={`mx-3 mb-2 rounded-xl overflow-hidden ${isDark ? 'bg-white/[0.04]' : 'bg-light-bg'}`}
        aria-labelledby={`${monthPanelId}-heading`}
      >
        <button
          id={`${monthPanelId}-heading`}
          className={`w-full flex items-center justify-between px-3.5 py-3 text-[13px] font-medium transition-colors border-b ${isDark ? 'text-gray-200 hover:bg-white/[0.04] border-transparent' : 'text-light-text hover:bg-light-card border-light-border'}`}
          onClick={() => setThisMonthOpen((v) => !v)}
          aria-expanded={thisMonthOpen}
          aria-controls={monthPanelId}
        >
          <span>This month</span>
          <Icon
            name={thisMonthOpen ? 'minus' : 'plus'}
            className={`w-3.5 h-3.5 ${isDark ? 'text-gray-500' : 'text-light-text-secondary'}`}
            aria-hidden="true"
          />
        </button>
        {thisMonthOpen && <div id={monthPanelId}><TaskList onAdd={onAddEvent} /></div>}
      </section>

      {/* Quick notes */}
      <section 
        className={`mx-3 mb-2 rounded-xl overflow-hidden ${isDark ? 'bg-white/[0.04]' : 'bg-light-bg'}`}
        aria-labelledby={`${notesPanelId}-heading`}
      >
        <button
          id={`${notesPanelId}-heading`}
          className={`w-full flex items-center justify-between px-3.5 py-3 text-[13px] font-medium transition-colors border-b ${isDark ? 'text-gray-200 hover:bg-white/[0.04] border-transparent' : 'text-light-text hover:bg-light-card border-light-border'}`}
          onClick={() => setNotesOpen((v) => !v)}
          aria-expanded={notesOpen}
          aria-controls={notesPanelId}
        >
          <span>Quick notes</span>
          <Icon
            name={notesOpen ? 'minus' : 'plus'}
            className={`w-3.5 h-3.5 ${isDark ? 'text-gray-500' : 'text-light-text-secondary'}`}
            aria-hidden="true"
          />
        </button>
        {notesOpen && (
          <div id={notesPanelId} className="px-3 pb-3" role="region">
            <label id={notesLabelId} className="sr-only">Quick notes</label>
            <textarea
              className={`w-full border rounded-lg text-xs p-2 resize-none outline-none focus:border-accent/50 transition-colors ${isDark ? 'bg-white/5 border-white/10 text-gray-400' : 'border-light-border text-light-text-secondary'}`}
              style={{ backgroundColor: '#faf9f7' }}
              rows={4}
              placeholder="Jot something down…"
              aria-labelledby={notesLabelId}
            />
          </div>
        )}
      </section>

      {/* Add section */}
      <button 
        className={`mx-3 mb-4 px-3.5 py-2.5 rounded-xl border-dashed text-[12.5px] transition-all text-center flex items-center justify-center gap-1.5 ${
          isDark ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-accent/50 text-gray-600 hover:text-accent' : 'border-light-border bg-light-bg hover:bg-light-card hover:border-light-text-secondary text-light-text-secondary hover:text-light-text'
        }`}
        aria-label="Add new section"
      >
        <Icon name="plus" className="w-3 h-3" aria-hidden="true" />
        Add section
      </button>

      <div className={`h-px mx-3 ${isDark ? 'bg-white/[0.07]' : 'bg-light-border'}`} role="separator" aria-hidden="true" />

      <MiniCalendar />
    </aside>
  )
}
