import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

const COLOR_MAP = {
  pink:  { bg: 'bg-event-pink dark:bg-[#3d2040]',  border: '#c060d0', text: '#4a1259', darkText: '#f5d8f8' },
  green: { bg: 'bg-event-green dark:bg-[#1a3d28]', border: '#2a9e5a', text: '#0d4a22', darkText: '#c8f0d8' },
  blue:  { bg: 'bg-event-blue dark:bg-[#1a2d4a]',  border: '#3070c8', text: '#082d5e', darkText: '#c8dcf5' },
  amber: { bg: 'bg-event-amber dark:bg-[#3d2e10]', border: '#c87820', text: '#522c05', darkText: '#f5e8c0' },
  gray:  { bg: 'bg-event-gray dark:bg-[#2a2a2a]',  border: '#888888', text: '#222222', darkText: '#e0e0e0' },
}

export default function EventBlock({ event, topPx, heightPx, dimmed, onClick }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: { event },
  })

  const colorScheme = COLOR_MAP[event.color] || COLOR_MAP.gray
  const isDark = document.documentElement.classList.contains('dark')
  const titleColor = isDark ? colorScheme.darkText : colorScheme.text

  const style = {
    position: 'absolute',
    top: topPx,
    height: Math.max(heightPx, 24),
    left: 4,
    right: 4,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : dimmed ? 0.2 : 1,
    zIndex: isDragging ? 50 : 4,
    transition: isDragging ? 'none' : 'opacity 0.15s, box-shadow 0.15s',
    cursor: isDragging ? 'grabbing' : 'grab',
    borderLeft: `4px solid ${colorScheme.border}`,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg px-2 py-1.5 overflow-hidden select-none hover:shadow-md ${colorScheme.bg}`}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onClick(event) }}
    >
      <div className="absolute inset-0 bg-white/0 hover:bg-white/10 transition-colors rounded-lg" />
      <div className="relative">
        <p 
          className={`text-[13px] font-semibold leading-tight ${event.done ? 'line-through opacity-50' : ''}`}
          style={{ color: titleColor }}
        >
          {event.title}
        </p>
        {event.sub && heightPx > 36 && (
          <p className="text-[11px] mt-0.5 truncate text-gray-600 dark:text-gray-400">{event.sub}</p>
        )}
      </div>
    </div>
  )
}
