import React, { useState } from 'react'
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
          className="w-[760px] h-[620px] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-modalIn border theme-panel"
        >
          <div className="px-6 py-5 border-b border-[color:var(--theme-border)] flex items-center justify-between">
            <h2 className="text-[18px] font-semibold tracking-tight theme-text-primary">
              Settings
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors theme-text-secondary theme-hover-text hover:bg-black/5 dark:hover:bg-white/10"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 pt-4 pb-2">
            <nav className="flex flex-wrap gap-2">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3.5 py-2 rounded-full text-[12px] font-medium theme-tab-pill ${
                      activeTab === tab.id ? 'theme-tab-pill-active' : ''
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
            </nav>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar animate-fadeUp">
              {activeTab === 'general' && <GeneralTab />}
              {activeTab === 'appearance' && <AppearanceTab />}
              {activeTab === 'calendar' && <CalendarTab />}
              {activeTab === 'notifications' && <NotificationsTab />}
              {activeTab === 'whatsapp' && <WhatsAppTab />}
              {activeTab === 'about' && <AboutTab />}
          </div>
        </div>
      </div>
    </>
  )
}
