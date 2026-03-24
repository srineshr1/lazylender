import React from 'react'
import { useDarkStore } from '../../../store/useDarkStore'
import { useSettingsStore } from '../../../store/useSettingsStore'

export default function CalendarTab() {
  const { isDark } = useDarkStore()
  const {
    defaultView,
    awakeStart,
    awakeEnd,
    showPastEvents,
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
      <div className={`text-[11px] font-semibold uppercase tracking-wider mb-4 ${
        isDark ? 'text-gray-500' : 'text-gray-400'
      }`}>
        View Settings
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className={`text-[13px] font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              Default View
            </p>
            <p className={`text-[12px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Shown when app opens
            </p>
          </div>
          <div className="flex rounded-lg overflow-hidden border ${
            isDark ? 'border-white/10' : 'border-gray-200'
          }">
            {['day', 'week', 'month'].map((view) => (
              <button
                key={view}
                onClick={() => updateSetting('defaultView', view)}
                className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  defaultView === view
                    ? isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-900'
                    : isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className={`text-[13px] font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              Show Past Events
            </p>
            <p className={`text-[12px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Display completed events
            </p>
          </div>
          <button
            onClick={() => updateSetting('showPastEvents', !showPastEvents)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              showPastEvents 
                ? 'bg-accent' 
                : isDark ? 'bg-white/20' : 'bg-gray-300'
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              showPastEvents ? 'translate-x-5' : ''
            }`} />
          </button>
        </div>

        <div className={`h-px my-4 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />

        <div className={`text-[11px] font-semibold uppercase tracking-wider mb-4 ${
          isDark ? 'text-gray-500' : 'text-gray-400'
        }`}>
          Display Hours
        </div>

        <div className="py-2">
          <div className="flex items-center justify-between mb-3">
            <p className={`text-[13px] font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              Awake Hours
            </p>
            <p className={`text-[12px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {formatHour(awakeStart)} - {formatHour(awakeEnd)}
            </p>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
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
              <label className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
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
