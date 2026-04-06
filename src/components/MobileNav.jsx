import React from 'react'
import { Icon } from './Icons'
import { useDarkStore } from '../store/useDarkStore'

/**
 * Mobile bottom navigation bar
 * Shows on mobile devices for quick access to sidebar, calendar, today, and chat
 * Note: Menu and Add buttons are in TopBar, not duplicated here
 */
export default function MobileNav({ 
  activePanel, 
  onSidebarClick, 
  onChatClick, 
  onTodayClick,
  hasUnreadChat = false 
}) {
  const { isDark } = useDarkStore()

  // Close any panel = go to calendar view
  const handleCalendarClick = () => {
    if (activePanel) {
      onSidebarClick() // This toggles off the current panel
    }
  }

  return (
    <nav 
      className={`fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-4 py-2 border-t safe-area-bottom md:hidden ${
        isDark 
          ? 'bg-sidebar border-white/10' 
          : 'bg-white border-gray-200'
      }`}
      role="navigation"
      aria-label="Mobile navigation"
    >
      {/* Sidebar/Tasks button */}
      <button
        onClick={onSidebarClick}
        className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-colors ${
          activePanel === 'sidebar'
            ? 'text-accent bg-accent/10'
            : isDark
              ? 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        }`}
        aria-label="Open sidebar"
        aria-pressed={activePanel === 'sidebar'}
      >
        <Icon name="sidebar" className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 font-medium">Tasks</span>
      </button>

      {/* Calendar/Home button */}
      <button
        onClick={handleCalendarClick}
        className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-colors ${
          !activePanel
            ? 'text-accent bg-accent/10'
            : isDark
              ? 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        }`}
        aria-label="View calendar"
        aria-pressed={!activePanel}
      >
        <Icon name="calendar" className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 font-medium">Calendar</span>
      </button>

      {/* Today button */}
      <button
        onClick={onTodayClick}
        className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-colors ${
          isDark
            ? 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        }`}
        aria-label="Go to today"
      >
        <Icon name="today" className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 font-medium">Today</span>
      </button>

      {/* AI Chat button */}
      <button
        onClick={onChatClick}
        className={`relative flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-colors ${
          activePanel === 'chat'
            ? 'text-accent bg-accent/10'
            : isDark
              ? 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        }`}
        aria-label={hasUnreadChat ? 'Open AI chat (new messages)' : 'Open AI chat'}
        aria-pressed={activePanel === 'chat'}
      >
        <Icon name="sparkles" className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 font-medium">AI</span>
        {hasUnreadChat && (
          <span 
            className="absolute top-1 right-3 w-2 h-2 rounded-full bg-accent animate-pulse"
            aria-hidden="true"
          />
        )}
      </button>
    </nav>
  )
}
