import React from 'react'
import { useDarkStore } from '../../../store/useDarkStore'
import { useSettingsStore } from '../../../store/useSettingsStore'

export default function NotificationsTab() {
  const { isDark } = useDarkStore()
  const {
    notificationsEnabled,
    reminderTime,
    updateSetting,
  } = useSettingsStore()

  return (
    <div>
      <div className={`text-[11px] font-semibold uppercase tracking-wider mb-4 ${
        isDark ? 'text-gray-500' : 'text-gray-400'
      }`}>
        Notifications
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className={`text-[13px] font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              Enable Notifications
            </p>
            <p className={`text-[12px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Show reminders for upcoming events
            </p>
          </div>
          <button
            onClick={() => updateSetting('notificationsEnabled', !notificationsEnabled)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              notificationsEnabled 
                ? 'bg-accent' 
                : isDark ? 'bg-white/20' : 'bg-gray-300'
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              notificationsEnabled ? 'translate-x-5' : ''
            }`} />
          </button>
        </div>

        {notificationsEnabled && (
          <div className="flex items-center justify-between py-2 pl-4 border-l-2 border-accent/30">
            <div>
              <p className={`text-[13px] font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                Reminder Time
              </p>
              <p className={`text-[12px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Before event starts
              </p>
            </div>
            <select
              value={reminderTime}
              onChange={(e) => updateSetting('reminderTime', parseInt(e.target.value))}
              className={`px-3 py-1.5 rounded-lg text-[13px] border outline-none transition-colors ${
                isDark
                  ? 'bg-[#252340] border-white/10 text-gray-200 focus:border-white/30'
                  : 'bg-white border-gray-200 text-gray-700 focus:border-gray-400'
              }`}
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
