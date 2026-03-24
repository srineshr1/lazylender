import React from 'react'
import { Icon } from './Icons'
import { useDarkStore } from '../store/useDarkStore'

/**
 * Mobile bottom navigation bar
 * Shows on mobile devices for quick access to sidebar, calendar, and chat
 */
export default function MobileNav({ 
  activePanel, 
  onSidebarClick, 
  onChatClick, 
  onAddClick,
  hasUnreadChat = false 
}) {
  const { isDark } = useDarkStore()

  return (
    <nav 
      className={`fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-2 border-t safe-area-bottom md:hidden ${
        isDark 
          ? 'bg-sidebar border-white/10' 
          : 'bg-white border-gray-200'
      }`}
      role="navigation"
      aria-label="Mobile navigation"
    >
      {/* Sidebar/Menu button */}
      <button
        onClick={onSidebarClick}
        className={`flex flex-col items-center justify-center w-16 h-12 rounded-lg transition-colors ${
          activePanel === 'sidebar'
            ? 'text-accent bg-accent/10'
            : isDark
              ? 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        }`}
        aria-label="Open menu"
        aria-pressed={activePanel === 'sidebar'}
      >
        <Icon name="menu" className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 font-medium">Menu</span>
      </button>

      {/* Calendar/Home button */}
      <button
        onClick={() => activePanel && onSidebarClick()} 
        className={`flex flex-col items-center justify-center w-16 h-12 rounded-lg transition-colors ${
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

      {/* Add event button (center, prominent) */}
      <button
        onClick={onAddClick}
        className="flex items-center justify-center w-14 h-14 -mt-4 rounded-full bg-accent text-white shadow-lg shadow-accent/30 hover:bg-accent/90 transition-all active:scale-95"
        aria-label="Add new event"
      >
        <Icon name="plus" className="w-6 h-6" />
      </button>

      {/* Today button */}
      <button
        onClick={() => {/* Could dispatch jumpToDate(new Date()) */}}
        className={`flex flex-col items-center justify-center w-16 h-12 rounded-lg transition-colors ${
          isDark
            ? 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        }`}
        aria-label="Go to today"
      >
        <Icon name="today" className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 font-medium">Today</span>
      </button>

      {/* Chat button */}
      <button
        onClick={onChatClick}
        className={`relative flex flex-col items-center justify-center w-16 h-12 rounded-lg transition-colors ${
          activePanel === 'chat'
            ? 'text-accent bg-accent/10'
            : isDark
              ? 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        }`}
        aria-label={hasUnreadChat ? 'Open chat (new messages)' : 'Open chat'}
        aria-pressed={activePanel === 'chat'}
      >
        <Icon name="chat" className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 font-medium">Chat</span>
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
