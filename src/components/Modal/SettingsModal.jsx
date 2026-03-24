import React, { useState } from 'react'
import { useDarkStore } from '../../store/useDarkStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import GeneralTab from './tabs/GeneralTab'
import AppearanceTab from './tabs/AppearanceTab'
import CalendarTab from './tabs/CalendarTab'
import NotificationsTab from './tabs/NotificationsTab'
import WhatsAppTab from './tabs/WhatsAppTab'
import AboutTab from './tabs/AboutTab'

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'about', label: 'About' },
]

export default function SettingsModal({ isOpen, onClose }) {
  const { isDark } = useDarkStore()
  const [activeTab, setActiveTab] = useState('general')

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`w-[680px] h-[580px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-modalIn ${
            isDark ? 'bg-[#1a1a2e] border border-white/10' : 'bg-white border border-gray-200'
          }`}
        >
          <div className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-white/10' : 'border-gray-200'
          }`}>
            <h2 className={`text-[17px] font-semibold tracking-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              Settings
            </h2>
            <button
              onClick={onClose}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className={`w-[140px] flex-shrink-0 border-r ${
              isDark ? 'bg-[#141220] border-white/10' : 'bg-gray-50 border-gray-200'
            }`}>
              <nav className="p-2 space-y-0.5">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full px-3 py-2 rounded-lg text-[12px] font-medium transition-all text-left ${
                      activeTab === tab.id
                        ? isDark
                          ? 'bg-white/10 text-white'
                          : 'bg-white text-gray-900 shadow-sm'
                        : isDark
                        ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              {activeTab === 'general' && <GeneralTab />}
              {activeTab === 'appearance' && <AppearanceTab />}
              {activeTab === 'calendar' && <CalendarTab />}
              {activeTab === 'notifications' && <NotificationsTab />}
              {activeTab === 'whatsapp' && <WhatsAppTab />}
              {activeTab === 'about' && <AboutTab />}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
