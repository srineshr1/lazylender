import React from 'react'
import { useSettingsStore } from '../../../store/useSettingsStore'

export default function CalendarTab() {
  const {
    defaultView,
    awakeStart,
    awakeEnd,
    showPastEvents,
    savingKeys,
    updateSetting,
    updateMultiple,
  } = useSettingsStore()

  const formatHour = (hour) => {
    const h = hour % 12 || 12
    const ampm = hour >= 12 ? 'PM' : 'AM'
    return `${h}:00 ${ampm}`
  }

  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider mb-4 theme-text-secondary">
        View Settings
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-[13px] font-medium theme-text-primary">
              Default View
            </p>
            <p className="text-[12px] mt-0.5 theme-text-secondary">
              Shown when app opens
            </p>
          </div>
          <div className="flex rounded-lg overflow-hidden border border-[color:var(--theme-border)]">
            {['day', 'week', 'month'].map((view) => (
              <button
                key={view}
                onClick={() => updateSetting('defaultView', view)}
                disabled={savingKeys.defaultView}
                className={`px-3 py-1.5 text-[12px] font-medium transition-colors press-feedback ${
                  defaultView === view
                    ? 'theme-control-active'
                    : 'theme-text-secondary theme-hover-text'
                }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-[13px] font-medium theme-text-primary">
              Show Past Events
            </p>
            <p className="text-[12px] mt-0.5 theme-text-secondary">
              Display completed events
            </p>
          </div>
          <button
            onClick={() => updateSetting('showPastEvents', !showPastEvents)}
            disabled={savingKeys.showPastEvents}
            className={`relative w-10 h-5 rounded-full transition-colors press-feedback ${
              showPastEvents 
                ? 'theme-toggle-on' 
                : 'theme-toggle'
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              showPastEvents ? 'translate-x-5' : ''
            }`} />
          </button>
        </div>

        <div className="h-px my-4 border-t border-[color:var(--theme-border)]" />

        <div className="text-[11px] font-semibold uppercase tracking-wider mb-4 theme-text-secondary">
          Display Hours
        </div>

        <div className="py-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-medium theme-text-primary">
              Awake Hours
            </p>
            <p className="text-[12px] theme-text-secondary">
              {formatHour(awakeStart)} - {formatHour(awakeEnd)}
            </p>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-[11px] theme-text-secondary">
                Start: {formatHour(awakeStart)}
              </label>
              <input
                type="range"
                min={0}
                max={23}
                value={awakeStart}
                onChange={(e) => {
                  const val = parseInt(e.target.value)
                  if (val < awakeEnd) {
                    updateMultiple({ awakeStart: val })
                  }
                }}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-accent"
              />
            </div>
            <div>
              <label className="text-[11px] theme-text-secondary">
                End: {formatHour(awakeEnd)}
              </label>
              <input
                type="range"
                min={1}
                max={24}
                value={awakeEnd}
                onChange={(e) => {
                  const val = parseInt(e.target.value)
                  if (val > awakeStart) {
                    updateMultiple({ awakeEnd: val })
                  }
                }}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-accent"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
