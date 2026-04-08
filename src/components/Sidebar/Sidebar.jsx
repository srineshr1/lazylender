import React, { useState, useMemo, useCallback, useId } from 'react'
import TaskList from './TaskList'
import MiniCalendar from './MiniCalendar'
import { Icon } from '../Icons'
import { useDarkStore } from '../../store/useDarkStore'
import { useEventStore } from '../../store/useEventStore'
import { fmtDate } from '../../lib/dateUtils'

export default function Sidebar({ onAddEvent, onImportTimetable }) {
  const [todayOpen, setTodayOpen] = useState(true)
  const [thisMonthOpen, setThisMonthOpen] = useState(true)
  const [notesOpen, setNotesOpen] = useState(false)
  const { isDark } = useDarkStore()
  const { events, markDone } = useEventStore()

  const todayPanelId = useId()
  const monthPanelId = useId()
  const notesPanelId = useId()

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
      className="sidebar-root w-[260px] min-w-[260px] flex-shrink-0 flex flex-col h-full overflow-y-auto"
      role="complementary"
      aria-label="Sidebar navigation"
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 flex items-center flex-shrink-0 sidebar-fade-in" style={{ animationDelay: '0ms' }}>
        <span className="font-display text-[22px] tracking-tight sidebar-logo">kairo</span>
      </div>

      {/* Today section */}
      <SidebarSection
        id={todayPanelId}
        label={
          <span>
            Today
            {totalCount > 0 && (
              <span className="sidebar-section-meta ml-2">
                · {completedCount}/{totalCount}
              </span>
            )}
          </span>
        }
        isOpen={todayOpen}
        onToggle={() => setTodayOpen(v => !v)}
        animDelay="60ms"
      >
        {todayEvents.length === 0 ? (
          <p className="sidebar-empty-text text-xs py-3 text-center">No events today</p>
        ) : (
          <ul className="space-y-1 py-1" role="list">
            {todayEvents.map((event, i) => (
              <li
                key={event.id}
                className={`sidebar-today-item flex items-start gap-2.5 px-1 py-1.5 rounded-lg ${event.done ? 'opacity-50' : 'opacity-100'}`}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <button
                  onClick={() => markDone(event.id)}
                  className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center mt-0.5 transition-all duration-200 ${
                    event.done ? 'border-accent bg-accent' : 'sidebar-checkbox'
                  }`}
                  role="checkbox"
                  aria-checked={event.done}
                  aria-label={`${event.title}: ${event.done ? 'Mark incomplete' : 'Mark complete'}`}
                >
                  {event.done && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-[13px] sidebar-item-title ${event.done ? 'line-through' : ''}`}>
                    {event.title}
                  </div>
                  <div className="text-[11px] mt-0.5 sidebar-item-sub">
                    {event.time}{event.sub && ` · ${event.sub}`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SidebarSection>

      {/* This month section */}
      <SidebarSection
        id={monthPanelId}
        label="This month"
        isOpen={thisMonthOpen}
        onToggle={() => setThisMonthOpen(v => !v)}
        animDelay="90ms"
      >
        <TaskList onAdd={onAddEvent} />
      </SidebarSection>

      {/* Quick notes */}
      <SidebarSection
        id={notesPanelId}
        label="Quick notes"
        isOpen={notesOpen}
        onToggle={() => setNotesOpen(v => !v)}
        animDelay="120ms"
      >
        <textarea
          className="sidebar-notes w-full text-xs p-2.5 resize-none outline-none rounded-lg"
          rows={4}
          placeholder="Jot something down…"
          aria-label="Quick notes"
        />
      </SidebarSection>

      {/* Add section button */}
      <button
        className="sidebar-add-section mx-3 mb-2 px-3.5 py-2.5 rounded-xl text-[12.5px] flex items-center justify-center gap-1.5 sidebar-fade-in"
        style={{ animationDelay: '150ms' }}
        aria-label="Add new section"
      >
        <Icon name="plus" className="w-3 h-3" aria-hidden="true" />
        Add section
      </button>

      {/* Import Timetable button */}
      {onImportTimetable && (
        <button
          onClick={onImportTimetable}
          className="mx-3 mb-4 px-3.5 py-2.5 rounded-xl text-[12.5px] flex items-center justify-center gap-2 sidebar-fade-in bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 transition-colors"
          style={{ animationDelay: '180ms' }}
          aria-label="Import timetable from image or PDF"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Import Timetable
        </button>
      )}

      <div className="sidebar-divider h-px mx-3" role="separator" aria-hidden="true" />

      <MiniCalendar />
    </aside>
  )
}

function SidebarSection({ id, label, isOpen, onToggle, children, animDelay = '0ms' }) {
  return (
    <section
      className="sidebar-section mx-3 mb-2 rounded-xl overflow-hidden sidebar-fade-in"
      style={{ animationDelay: animDelay }}
    >
      <button
        className="sidebar-section-header w-full flex items-center justify-between px-3.5 py-3 text-[13px] font-medium transition-colors"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={id}
      >
        <span className="sidebar-section-title">{label}</span>
        <span className={`sidebar-chevron transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      <div
        id={id}
        className="sidebar-section-body"
        style={{
          display: 'grid',
          gridTemplateRows: isOpen ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div className="px-3 pb-3 pt-1">{children}</div>
        </div>
      </div>
    </section>
  )
}
