import React from 'react'
import { useSettingsStore } from '../../../store/useSettingsStore'

export default function GeneralTab() {
  const { defaultEventDuration, defaultEventColor, savingKeys, updateSetting } = useSettingsStore()

  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider mb-4 theme-text-secondary">
        Event Defaults
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-[13px] font-medium theme-text-primary">
              Default Duration
            </p>
            <p className="text-[12px] mt-0.5 theme-text-secondary">
              Pre-filled when creating events
            </p>
          </div>
          <select
            value={defaultEventDuration}
            onChange={(e) => updateSetting('defaultEventDuration', parseInt(e.target.value))}
            disabled={savingKeys.defaultEventDuration}
            className="px-3 py-1.5 rounded-lg text-[13px] outline-none theme-control press-feedback"
          >
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
          </select>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-[13px] font-medium theme-text-primary">
              Default Color
            </p>
            <p className="text-[12px] mt-0.5 theme-text-secondary">
              Color for new events
            </p>
          </div>
          <div className="flex gap-2">
            {['pink', 'green', 'blue', 'amber', 'gray'].map((color) => (
              <button
                key={color}
                onClick={() => updateSetting('defaultEventColor', color)}
                disabled={savingKeys.defaultEventColor}
                className={`w-6 h-6 rounded-md transition-all press-feedback ${
                  defaultEventColor === color ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : ''
                } ${
                  color === 'pink' ? 'bg-pink-200' :
                  color === 'green' ? 'bg-green-200' :
                  color === 'blue' ? 'bg-blue-200' :
                  color === 'amber' ? 'bg-amber-200' :
                  'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
