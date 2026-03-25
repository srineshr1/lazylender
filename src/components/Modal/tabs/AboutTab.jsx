import React from 'react'
import { useSettingsStore } from '../../../store/useSettingsStore'

export default function AboutTab() {
  const { resetToDefaults, savingKeys } = useSettingsStore()

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
      <div className="text-[11px] font-semibold uppercase tracking-wider mb-4 theme-text-secondary">
        About
      </div>

      <div className="space-y-5">
        <div className="space-y-3 py-2">
          <div className="flex justify-between">
            <span className="text-[13px] theme-text-secondary">
              Version
            </span>
            <span className="text-[13px] font-medium theme-text-primary">
              1.0.0
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[13px] theme-text-secondary">
              Built with
            </span>
            <span className="text-[13px] theme-text-primary">
              React, Zustand, Tailwind
            </span>
          </div>
        </div>

        <div className="h-px my-4 border-t border-[color:var(--theme-border)]" />

        <div className="text-[11px] font-semibold uppercase tracking-wider mb-4 theme-text-secondary">
          Data
        </div>

        <div className="space-y-3">
          <div>
              <button
                onClick={handleResetSettings}
                disabled={savingKeys.themePreset || savingKeys.accentColor}
                className="px-4 py-2 rounded-lg text-[13px] font-medium transition-colors theme-control press-feedback"
              >
                {savingKeys.themePreset || savingKeys.accentColor ? 'Working...' : 'Reset Settings'}
              </button>
              <p className="text-[11px] mt-1 theme-text-secondary">
                Restore default settings
              </p>
            </div>

          <div>
              <button
                onClick={handleResetData}
                className="px-4 py-2 rounded-lg text-[13px] font-medium bg-red-600 hover:bg-red-700 text-white transition-colors press-feedback"
              >
                Reset All Data
              </button>
              <p className="text-[11px] mt-1 theme-text-secondary">
                Delete all events and history
              </p>
            </div>
        </div>
      </div>
    </div>
  )
}
