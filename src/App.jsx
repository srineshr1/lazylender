import React, { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar/Sidebar'
import TopBar from './components/Calendar/TopBar'
import WeekView from './components/Calendar/WeekView'
import ChatSidebar from './components/Chat/ChatSidebar'
import EventModal from './components/Modal/EventModal'
import { useEventStore } from './store/useEventStore'
import { useDarkStore } from './store/useDarkStore'
function PlaceholderView({ label }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-main text-gray-400 text-sm font-sans">
      <div className="text-center">
        <div className="text-3xl mb-3 opacity-30">
          <svg className="w-10 h-10 mx-auto" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-[13px] text-gray-400">{label} view coming soon</p>
      </div>
    </div>
  )
}

export default function App() {
  const [activeView, setActiveView] = useState('Week')
  const [modal, setModal] = useState({ open: false, event: null, date: null, time: null })
  const { events } = useEventStore()
  const { isDark } = useDarkStore()

  // Set initial dark mode on mount
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  // Update dark mode when isDark changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  const openAdd = (date = null, time = null) =>
    setModal({ open: true, event: null, date, time })

  const openEdit = (ev) => {
    const source = ev._sourceId ? events.find((e) => e.id === ev._sourceId) : ev
    setModal({ open: true, event: source || ev, date: null, time: null })
  }

  const closeModal = () => setModal({ open: false, event: null, date: null, time: null })

  const renderView = () => {
    switch (activeView) {
      case 'Week':
        return (
          <WeekView
            onEventClick={openEdit}
            onSlotClick={(date, time) => openAdd(date, time)}
          />
        )
      case 'Day':
        return <PlaceholderView label="Day" />
      case 'Month':
        return <PlaceholderView label="Month" />
      default:
        return null
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-sidebar-deep font-sans">
      <div className="flex-shrink-0">
        <Sidebar onAddEvent={() => openAdd()} />
      </div>

      <main className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar
          activeView={activeView}
          setActiveView={setActiveView}
          onAddEvent={() => openAdd()}
        />
        <div className="flex-1 min-w-0 min-h-0 overflow-hidden bg-main dark:bg-[#1a1a2e] flex flex-col">
          {renderView()}
        </div>
      </main>

      <div className="flex-shrink-0">
        <ChatSidebar />
      </div>

      <EventModal
        isOpen={modal.open}
        onClose={closeModal}
        editEvent={modal.event}
        defaultDate={modal.date}
        defaultTime={modal.time}
      />
    </div>
  )
}
