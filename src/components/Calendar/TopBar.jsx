import React from 'react'
import { Icon } from '../Icons'
import { useEventStore } from '../../store/useEventStore'
import { useDarkStore } from '../../store/useDarkStore'

const VIEWS = ['Day', 'Week', 'Month']

export default function TopBar({ activeView, setActiveView, onAddEvent }) {
  const { searchQuery, setSearchQuery } = useEventStore()
  const { isDark, toggle } = useDarkStore()

  return (
    <div className="bg-white dark:bg-[#1f1d30] border-b border-black/[0.08] dark:border-white/10 px-6 h-14 flex items-center gap-4 flex-shrink-0">
      {/* Search */}
      <div className="flex items-center gap-2 bg-main dark:bg-[#252340] rounded-lg px-3 py-1.5 border border-black/[0.06] dark:border-white/10 w-56">
        <Icon name="search" className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search events…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none outline-none text-[13px] text-gray-700 dark:text-gray-200 placeholder-gray-400 w-full font-sans"
        />
      </div>

      <div className="flex-1" />

      {/* View tabs — Day / Week / Month only */}
      <div className="flex gap-0.5 bg-[#f0eeed] dark:bg-[#252340] rounded-lg p-0.5">
        {VIEWS.map((v) => (
          <button
            key={v}
            onClick={() => setActiveView(v)}
            className={`
              px-3.5 py-1.5 rounded-md text-[12.5px] font-medium transition-all duration-150
              ${activeView === v
                ? 'bg-white dark:bg-[#1a1a2e] text-gray-800 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-white/10'}
            `}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      <div className="flex gap-1">
        <button
          onClick={() => toggle()}
          className="w-8 h-8 rounded-lg hover:bg-[#f0eeed] dark:hover:bg-white/10 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 flex items-center justify-center transition-colors"
          title="Toggle dark mode"
        >
          <Icon name={isDark ? 'sun' : 'moon'} className="w-4 h-4" />
        </button>
        <button
          onClick={onAddEvent}
          className="w-8 h-8 rounded-lg hover:bg-[#f0eeed] dark:hover:bg-white/10 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 flex items-center justify-center transition-colors"
          title="Add event"
        >
          <Icon name="plus" className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 rounded-lg hover:bg-[#f0eeed] dark:hover:bg-white/10 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center justify-center transition-colors" title="Profile">
          <Icon name="user" className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 rounded-lg hover:bg-[#f0eeed] dark:hover:bg-white/10 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center justify-center transition-colors" title="Notifications">
          <Icon name="bell" className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 rounded-lg hover:bg-[#f0eeed] dark:hover:bg-white/10 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center justify-center transition-colors" title="Settings">
          <Icon name="cog" className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
