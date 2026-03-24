import React from 'react'
import { useDarkStore } from '../../../store/useDarkStore'
import { useSettingsStore } from '../../../store/useSettingsStore'

export default function AboutTab() {
  const { isDark } = useDarkStore()
  const { resetToDefaults } = useSettingsStore()

  const handleResetSettings = () => {
    if (window.confirm('Reset all settings to defaults?')) {
      resetToDefaults()
    }
  }

  const handleResetData = () => {
    if (window.confirm('This will delete ALL your events and data. This cannot be undone.')) {
      const confirmation = prompt('Type DELETE to confirm:')
      if (confirmation === 'DELETE') {
        localStorage.clear()
        window.location.reload()
      }
    }
  }

  return (
    <div>
      <div className={`text-[11px] font-semibold uppercase tracking-wider mb-4 ${
        isDark ? 'text-gray-500' : 'text-gray-400'
      }`}>
        About
      </div>

      <div className="space-y-5">
        <div className="space-y-3 py-2">
          <div className="flex justify-between">
            <span className={`text-[13px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Version
            </span>
            <span className={`text-[13px] font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              1.0.0
            </span>
          </div>
          <div className="flex justify-between">
            <span className={`text-[13px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Built with
            </span>
            <span className={`text-[13px] ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              React, Zustand, Tailwind
            </span>
          </div>
        </div>

        <div className={`h-px my-4 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />

        <div className={`text-[11px] font-semibold uppercase tracking-wider mb-4 ${
          isDark ? 'text-gray-500' : 'text-gray-400'
        }`}>
          Data
        </div>

        <div className="space-y-3">
          <div>
            <button
              onClick={handleResetSettings}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                isDark
                  ? 'bg-white/10 hover:bg-white/15 text-gray-200'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              Reset Settings
            </button>
            <p className={`text-[11px] mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              Restore default settings
            </p>
          </div>

          <div>
            <button
              onClick={handleResetData}
              className="px-4 py-2 rounded-lg text-[13px] font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
            >
              Reset All Data
            </button>
            <p className={`text-[11px] mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              Delete all events and history
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
