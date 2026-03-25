import React, { memo, useMemo } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { getEventAriaLabel } from '../../lib/accessibility'
import { useThemeColors } from '../../hooks/useThemeColors'

function EventBlock({ event, topPx, heightPx, dimmed, opacity, onClick }) {
  const { getEventColor } = useThemeColors()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: { event },
  })

  const colorScheme = useMemo(() => getEventColor(event.color), [getEventColor, event.color])
  const titleColor = colorScheme.text

  const dragTransform = transform ? CSS.Transform.toString(transform) : undefined
  
  // Combine drag position with scale effect
  const combinedTransform = isDragging && dragTransform
    ? `${dragTransform} scale(0.93)`
    : dragTransform || 'scale(1)'

  // Calculate final opacity: dragging > dimmed (search) > opacity prop > 1
  const finalOpacity = isDragging ? 0 : dimmed ? 0.15 : (opacity !== undefined ? opacity : 1)
  
  const style = useMemo(() => ({
    position: 'absolute',
    top: topPx,
    height: Math.max(heightPx, 24),
    left: 4,
    right: 4,
    transform: combinedTransform,
    opacity: finalOpacity,
    zIndex: isDragging ? 50 : 4,
    transition: isDragging 
      ? 'transform 0.15s ease, opacity 0s' 
      : 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease',
    cursor: isDragging ? 'grabbing' : 'grab',
    borderLeft: `4px solid ${colorScheme.border}`,
    backgroundColor: colorScheme.bg,
    touchAction: 'none',
  }), [topPx, heightPx, combinedTransform, finalOpacity, isDragging, colorScheme.border])

  // Generate accessible label
  const ariaLabel = useMemo(() => getEventAriaLabel(event), [event])

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg px-2 py-1.5 overflow-hidden select-none hover:shadow-lg hover:brightness-105 event-block"
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onClick(event) }}
      role="button"
      aria-label={ariaLabel}
      aria-grabbed={isDragging}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          onClick(event)
        }
      }}
    >
      <div className="absolute inset-0 hover:bg-white/10 transition-colors duration-150 rounded-lg" aria-hidden="true" />
      <div className="relative">
        <p 
          className={`text-[13px] font-semibold leading-tight ${event.done ? 'line-through opacity-50' : ''}`}
          style={{ color: titleColor }}
        >
          {event.title}
        </p>
        {event.sub && heightPx > 36 && (
          <p className="text-[11px] mt-0.5 truncate theme-text-secondary">{event.sub}</p>
        )}
      </div>
    </div>
  )
}

// Custom comparison function for React.memo
// Only re-render if event data, position, or visual state changes
function areEqual(prevProps, nextProps) {
  return (
    prevProps.event.id === nextProps.event.id &&
    prevProps.event.title === nextProps.event.title &&
    prevProps.event.sub === nextProps.event.sub &&
    prevProps.event.color === nextProps.event.color &&
    prevProps.event.done === nextProps.event.done &&
    prevProps.topPx === nextProps.topPx &&
    prevProps.heightPx === nextProps.heightPx &&
    prevProps.dimmed === nextProps.dimmed &&
    prevProps.opacity === nextProps.opacity
  )
}

export default memo(EventBlock, areEqual)
