import React from 'react'
import { useDarkStore } from '../../../store/useDarkStore'
import { useSettingsStore } from '../../../store/useSettingsStore'

export default function AppearanceTab() {
  const { isDark } = useDarkStore()
  const { accentColor, compactMode, showWeekends, updateSetting } = useSettingsStore()

  const accentColors = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Green', value: '#10b981' },
    { name: 'Orange', value: '#f59e0b' },
    { name: 'Red', value: '#ef4444' },
  ]

  return (
    <div>
      <div className={`text-[11px] font-semibold uppercase tracking-wider mb-4 ${
        isDark ? 'text-gray-500' : 'text-gray-400'
      }`}>
        Theme
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className={`text-[13px] font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              Accent Color
            </p>
            <p className={`text-[12px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Primary color used throughout
            </p>
          </div>
          <div className="flex gap-2">
            {accentColors.map(({ name, value }) => (
              <button
                key={value}
                onClick={() => updateSetting('accentColor', value)}
                title={name}
                className={`w-7 h-7 rounded-full transition-all ${
                  accentColor === value 
                    ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' 
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: value }}
              />
            ))}
          </div>
        </div>

        <div className={`h-px my-4 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />

        <div className={`text-[11px] font-semibold uppercase tracking-wider mb-4 ${
          isDark ? 'text-gray-500' : 'text-gray-400'
        }`}>
          Layout
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className={`text-[13px] font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              Show Weekends
            </p>
            <p className={`text-[12px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Display Sat and Sun in week view
            </p>
          </div>
          <button
            onClick={() => updateSetting('showWeekends', !showWeekends)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              showWeekends 
                ? 'bg-accent' 
                : isDark ? 'bg-white/20' : 'bg-gray-300'
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              showWeekends ? 'translate-x-5' : ''
            }`} />
          </button>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className={`text-[13px] font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              Compact Mode
            </p>
            <p className={`text-[12px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Denser layout with less spacing
            </p>
          </div>
          <button
            onClick={() => updateSetting('compactMode', !compactMode)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              compactMode 
                ? 'bg-accent' 
                : isDark ? 'bg-white/20' : 'bg-gray-300'
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              compactMode ? 'translate-x-5' : ''
            }`} />
          </button>
        </div>
      </div>
    </div>
  )
}
