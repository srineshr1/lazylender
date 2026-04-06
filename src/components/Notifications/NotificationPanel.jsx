import React, { useEffect, useRef } from 'react'
import NotificationItem from './NotificationItem'
import { useNotificationStore } from '../../store/useNotificationStore'
import { useEventStore } from '../../store/useEventStore'

/**
 * Group notifications by date (Today, Yesterday, Older)
 * @param {Array} notifications - Array of notification objects
 * @returns {Object} Grouped notifications
 */
const groupNotificationsByDate = (notifications) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const groups = {
    today: [],
    yesterday: [],
    older: [],
  }

  notifications.forEach((notification) => {
    const notifDate = new Date(notification.timestamp)
    const notifDay = new Date(
      notifDate.getFullYear(),
      notifDate.getMonth(),
      notifDate.getDate()
    )

    if (notifDay.getTime() === today.getTime()) {
      groups.today.push(notification)
    } else if (notifDay.getTime() === yesterday.getTime()) {
      groups.yesterday.push(notification)
    } else {
      groups.older.push(notification)
    }
  })

  return groups
}

/**
 * YouTube-style notification panel dropdown
 * Displays as a bubble below the bell icon
 */
export default function NotificationPanel() {
  const { notifications, clearAll, closePanel } = useNotificationStore()
  const { jumpToDate, events } = useEventStore()
  const panelRef = useRef(null)

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        // Check if click is on bell button (to prevent immediate close)
        if (!event.target.closest('[data-notification-trigger]')) {
          closePanel()
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [closePanel])

  // Handle view event
  const handleViewEvent = (eventId) => {
    const event = events.find((e) => e.id === eventId)
    if (event) {
      // Jump to the event's date
      jumpToDate(new Date(event.date))
      
      // TODO: Open event modal (will be implemented when modal ref is available)
      // For now, just jump to the date and close panel
      closePanel()
    }
  }

  const grouped = groupNotificationsByDate(notifications)
  const hasNotifications = notifications.length > 0

  return (
    <div
      ref={panelRef}
      className="absolute top-full right-0 mt-2 w-[calc(100vw-24px)] sm:w-[380px] max-w-[380px] max-h-[480px] rounded-2xl shadow-2xl overflow-hidden animate-slide-down z-50 glass-panel"
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-[color:var(--theme-border)] flex items-center justify-between"
      >
        <h3
          className="text-[15px] font-semibold theme-text-primary"
        >
          Notifications
        </h3>
        {hasNotifications && (
          <button
            onClick={clearAll}
            className="text-[12px] font-medium transition-colors theme-text-secondary theme-hover-text"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Content */}
      <div className="overflow-y-auto max-h-[420px] custom-scrollbar">
        {!hasNotifications ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="text-5xl mb-3">🎉</div>
            <p
              className="text-[14px] font-medium theme-text-primary"
            >
              All caught up!
            </p>
            <p
              className="text-[12px] mt-1 theme-text-secondary"
            >
              No new notifications
            </p>
          </div>
        ) : (
          /* Grouped notifications */
          <div>
            {grouped.today.length > 0 && (
              <div>
                <div
                  className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide theme-text-secondary"
                >
                  Today
                </div>
                {grouped.today.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onViewEvent={handleViewEvent}
                  />
                ))}
              </div>
            )}

            {grouped.yesterday.length > 0 && (
              <div>
                <div
                  className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide theme-text-secondary"
                >
                  Yesterday
                </div>
                {grouped.yesterday.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onViewEvent={handleViewEvent}
                  />
                ))}
              </div>
            )}

            {grouped.older.length > 0 && (
              <div>
                <div
                  className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide theme-text-secondary"
                >
                  Older
                </div>
                {grouped.older.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onViewEvent={handleViewEvent}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
