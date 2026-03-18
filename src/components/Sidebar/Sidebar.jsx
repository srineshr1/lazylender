import React, { useState } from 'react'
import TaskList from './TaskList'
import MiniCalendar from './MiniCalendar'
import { Icon } from '../Icons'
import { useDarkStore } from '../../store/useDarkStore'

export default function Sidebar({ onAddEvent }) {
  const [thisMonthOpen, setThisMonthOpen] = useState(true)
  const [notesOpen, setNotesOpen] = useState(false)
  const { isDark } = useDarkStore()

  return (
    <aside className={`w-[260px] min-w-[260px] flex-shrink-0 flex flex-col border-r overflow-y-auto ${
      isDark ? 'bg-sidebar' : 'bg-white border-black/10'
    }`}>
      {/* Logo */}
      <div className="px-5 pt-7 pb-5 flex items-center justify-between flex-shrink-0">
        <span className={`font-display text-[22px] tracking-tight ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>my.calendar</span>
        <div className="flex gap-1.5">
          <button
            onClick={onAddEvent}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
            title="Add event"
          >
            <Icon name="plus" className="w-3.5 h-3.5" />
          </button>
          <button className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
            <Icon name="minus" className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* This month section */}
      <div className={`mx-3 mb-2 rounded-xl overflow-hidden ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`}>
        <button
          className={`w-full flex items-center justify-between px-3.5 py-3 text-[13px] font-medium transition-colors ${isDark ? 'text-gray-200 hover:bg-white/[0.04]' : 'text-gray-700 hover:bg-gray-200/50'}`}
          onClick={() => setThisMonthOpen((v) => !v)}
        >
          <span>This month</span>
          <Icon
            name={thisMonthOpen ? 'minus' : 'plus'}
            className={`w-3.5 h-3.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
          />
        </button>
        {thisMonthOpen && <TaskList onAdd={onAddEvent} />}
      </div>

      {/* Quick notes */}
      <div className={`mx-3 mb-2 rounded-xl overflow-hidden ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`}>
        <button
          className={`w-full flex items-center justify-between px-3.5 py-3 text-[13px] font-medium transition-colors ${isDark ? 'text-gray-200 hover:bg-white/[0.04]' : 'text-gray-700 hover:bg-gray-200/50'}`}
          onClick={() => setNotesOpen((v) => !v)}
        >
          <span>Quick notes</span>
          <Icon
            name={notesOpen ? 'minus' : 'plus'}
            className={`w-3.5 h-3.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
          />
        </button>
        {notesOpen && (
          <div className="px-3 pb-3">
            <textarea
              className={`w-full border rounded-lg text-xs p-2 resize-none outline-none focus:border-accent/50 transition-colors ${isDark ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-white border-gray-200 text-gray-600'}`}
              rows={4}
              placeholder="Jot something down…"
            />
          </div>
        )}
      </div>

      {/* Add section */}
      <button className={`mx-3 mb-4 px-3.5 py-2.5 rounded-xl border-dashed text-[12.5px] transition-all text-center flex items-center justify-center gap-1.5 ${
        isDark ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-accent/50 text-gray-600 hover:text-accent' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 text-gray-500 hover:text-gray-700'
      }`}>
        <Icon name="plus" className="w-3 h-3" />
        Add section
      </button>

      <div className={`h-px mx-3 ${isDark ? 'bg-white/[0.07]' : 'bg-gray-200'}`} />

      <MiniCalendar />
    </aside>
  )
}
