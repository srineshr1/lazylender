import React from 'react'
import { useSettingsStore } from '../../../store/useSettingsStore'

export default function NotificationsTab() {
  const {
    notificationsEnabled,
    reminderTime,
    savingKeys,
    updateSetting,
  } = useSettingsStore()

  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider mb-4 theme-text-secondary">
        Notifications
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-[13px] font-medium theme-text-primary">
              Enable Notifications
            </p>
            <p className="text-[12px] mt-0.5 theme-text-secondary">
              Show reminders for upcoming events
            </p>
          </div>
          <button
            onClick={() => updateSetting('notificationsEnabled', !notificationsEnabled)}
            disabled={savingKeys.notificationsEnabled}
            className={`relative w-10 h-5 rounded-full transition-colors press-feedback ${
              notificationsEnabled 
                ? 'theme-toggle-on' 
                : 'theme-toggle'
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              notificationsEnabled ? 'translate-x-5' : ''
            }`} />
          </button>
        </div>

        {notificationsEnabled && (
          <div className="flex items-center justify-between py-2 pl-4 border-l-2 border-[color:var(--color-accent)]/30">
            <div>
              <p className="text-[13px] font-medium theme-text-primary">
                Reminder Time
              </p>
              <p className="text-[12px] mt-0.5 theme-text-secondary">
                Before event starts
              </p>
            </div>
            <select
              value={reminderTime}
              onChange={(e) => updateSetting('reminderTime', parseInt(e.target.value))}
              disabled={savingKeys.reminderTime}
              className="px-3 py-1.5 rounded-lg text-[13px] outline-none theme-control press-feedback"
            >
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
            </select>
          </div>
        )}
      </div>
    </div>
  )
}
