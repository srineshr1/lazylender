import React from 'react'
import { Icon } from '../Icons'
import { useNotificationStore } from '../../store/useNotificationStore'

/**
 * Format timestamp to relative time (e.g., "5 min ago", "2 hours ago")
 * @param {string} timestamp - ISO timestamp
 * @returns {string}
 */
const formatRelativeTime = (timestamp) => {
  const now = new Date()
  const past = new Date(timestamp)
  const diffMs = now - past
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return past.toLocaleDateString()
}

/**
 * Individual notification item component
 * @param {Object} props
 * @param {Object} props.notification - Notification object
 * @param {Function} props.onViewEvent - Callback when view event is clicked
 */
export default function NotificationItem({ notification, onViewEvent }) {
  const { markRead, deleteNotification } = useNotificationStore()

  const handleClick = () => {
    if (!notification.read) {
      markRead(notification.id)
    }
    if (notification.eventId && onViewEvent) {
      onViewEvent(notification.eventId)
    }
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    deleteNotification(notification.id)
  }

  return (
    <div
      onClick={handleClick}
      className={`group relative flex items-start gap-3 px-3 py-3 cursor-pointer transition-colors border-l-2 ${
        notification.read
          ? 'hover:bg-black/5 dark:hover:bg-white/10 border-transparent'
          : 'bg-accent/10 hover:bg-accent/15 border-accent'
      }`}
    >
      {/* Icon */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg glass-subtle"
      >
        {notification.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4
              className="text-[13px] font-medium theme-text-primary"
            >
              {notification.title}
            </h4>
            <p
              className="text-[12px] mt-0.5 theme-text-secondary"
            >
              {notification.message}
            </p>
            <p
              className="text-[11px] mt-1 theme-text-secondary"
            >
              {formatRelativeTime(notification.timestamp)}
            </p>
          </div>

          {/* Unread indicator & Delete button */}
          <div className="flex items-center gap-2">
            {!notification.read && (
              <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
            )}
            <button
              onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded flex items-center justify-center theme-icon-btn"
              aria-label="Delete notification"
            >
              <Icon name="x" className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* View Event Link */}
        {notification.eventId && (
          <button
            className="text-[11px] mt-2 font-medium transition-colors text-accent hover:text-accent/80"
          >
            View Event →
          </button>
        )}
      </div>
    </div>
  )
}
