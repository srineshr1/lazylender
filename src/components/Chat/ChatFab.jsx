import React, { useState, useEffect, useCallback } from 'react'

const SUGGESTIONS = [
  { text: 'Change my event to 2pm', icon: '✏️' },
  { text: "What's on my schedule today?", icon: '📅' },
  { text: 'Upload a timetable to import', icon: '📎' },
  { text: 'Create a meeting with John tomorrow', icon: '🤝' },
  { text: 'Remind me to call the dentist', icon: '🔔' },
]

const CYCLE_INTERVAL = 4000

export default function ChatFab({ onOpen, className = '' }) {
  const [index, setIndex] = useState(0)
  const [animState, setAnimState] = useState('idle')
  const [paused, setPaused] = useState(false)

  const current = SUGGESTIONS[index]

  const advance = useCallback(() => {
    setAnimState('exiting')
    setTimeout(() => {
      setIndex(prev => (prev + 1) % SUGGESTIONS.length)
      setAnimState('entering')
      setTimeout(() => setAnimState('idle'), 280)
    }, 200)
  }, [])

  useEffect(() => {
    if (paused) return
    const timer = setInterval(advance, CYCLE_INTERVAL)
    return () => clearInterval(timer)
  }, [paused, advance])

  const suggestionClass =
    animState === 'entering'
      ? 'animate-suggestionIn'
      : animState === 'exiting'
        ? 'animate-suggestionOut'
        : ''

  return (
    <div className={`fixed bottom-6 right-6 z-40 flex items-center gap-3 animate-fabGroupIn ${className}`}>
      <button
        onClick={() => onOpen(current.text)}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        className={`group flex items-center gap-2 px-3 py-2 rounded-xl glass-subtle shadow-lg 
          hover:shadow-xl transition-shadow max-w-[240px] cursor-pointer
          animate-fabSuggestionIn ${suggestionClass}`}
        aria-label={`Try: ${current.text}`}
      >
        <span className="text-sm flex-shrink-0">{current.icon}</span>
        <span className="text-[13px] theme-text-primary truncate">
          {current.text}
        </span>
      </button>

      <button
        onClick={() => onOpen()}
        className="w-14 h-14 rounded-full bg-accent shadow-lg hover:bg-accent/90 hover:shadow-xl transition-all flex items-center justify-center flex-shrink-0"
        aria-label="Open AI chat"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>
    </div>
  )
}