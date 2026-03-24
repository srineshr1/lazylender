import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar/Sidebar'
import TopBar from './components/Calendar/TopBar'
import WeekView from './components/Calendar/WeekView'
import DayView from './components/Calendar/DayView'
import MonthView from './components/Calendar/MonthView'
import ChatSidebar from './components/Chat/ChatSidebar'
import EventModal from './components/Modal/EventModal'
import SettingsModal from './components/Modal/SettingsModal'
import WhatsAppSettings from './components/WhatsApp/WhatsAppSettings'
import WhatsAppToast from './components/WhatsAppToast'
import ToastContainer from './components/ToastContainer'
import ProtectedRoute from './components/ProtectedRoute'
import OfflineIndicator from './components/OfflineIndicator'
import MobileNav from './components/MobileNav'
import MobileDrawer from './components/MobileDrawer'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import AuthCallback from './pages/AuthCallback'
import { useWhatsAppSync } from './hooks/useWhatsAppSync'
import { useNotificationTriggers } from './hooks/useNotificationTriggers'
import { useMobileLayout } from './hooks/useMobileLayout'
import { useEventStore } from './store/useEventStore'
import { useDarkStore } from './store/useDarkStore'
import { useSettingsStore } from './store/useSettingsStore'
import { useChatStore } from './store/useChatStore'
import { useAuth } from './contexts/AuthContext'
import { LoadingSkeleton } from './components/LoadingSpinner'
import getSupabaseClient from './lib/supabase'

function CalendarApp() {
  const settings = useSettingsStore()
  const [activeView, setActiveView] = useState('Week')
  const [modal, setModal] = useState({ open: false, event: null, date: null, time: null })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [whatsappSettingsOpen, setWhatsappSettingsOpen] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const { events } = useEventStore()
  const { isDark, setIsDark } = useDarkStore()
  const { lastSyncedEvents } = useWhatsAppSync()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const { user, authEnabled } = useAuth()
  const supabase = getSupabaseClient()
  
  // Mobile layout state
  const { 
    isMobile, 
    isCompact,
    activePanel, 
    isSidebarOpen, 
    isChatOpen,
    openSidebar,
    openChat,
    closePanel,
    toggleSidebar,
    toggleChat
  } = useMobileLayout()
  
  // Navigate to day view
  const navigateToDay = (date) => {
    setSelectedDate(date)
    setActiveView('Day')
  }
  
  // Initialize Supabase data when user logs in
  useEffect(() => {
    if (supabase && user && authEnabled) {
      let chatSub, settingsSub
      
      const initializeStores = async () => {
        console.log('[App] Initializing stores for user:', user.id)
        
        // Load initial data
        await useEventStore.getState().initializeSupabase(supabase, user.id)
        await useSettingsStore.getState().initializeSettings(supabase, user.id)
        await useChatStore.getState().initializeChat(supabase, user.id)
        
        // Subscribe to real-time changes
        console.log('[App] Setting up real-time subscriptions...')
        useEventStore.getState().subscribeToEvents(supabase, user.id)
        chatSub = useChatStore.getState().subscribeToMessages(supabase, user.id)
        settingsSub = useSettingsStore.getState().subscribeToSettings(supabase, user.id)
      }
      
      initializeStores()

      // Cleanup subscriptions on unmount or user change
      return () => {
        console.log('[App] Cleaning up real-time subscriptions...')
        useEventStore.getState().unsubscribeFromEvents()
        useChatStore.getState().unsubscribeFromMessages(chatSub)
        useSettingsStore.getState().unsubscribeFromSettings(settingsSub)
      }
    }
  }, [user, supabase, authEnabled])

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      useEventStore.getState().setOnline(true)
      if (supabase && user) {
        useEventStore.getState().syncPendingChanges(supabase)
      }
    }
    const handleOffline = () => {
      useEventStore.getState().setOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Set initial status
    useEventStore.getState().setOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [user, supabase])
  
  // Enable notification triggers
  useNotificationTriggers()

  // Apply all settings whenever they change
  useEffect(() => {
    // Apply accent color
    document.documentElement.style.setProperty('--color-accent', settings.accentColor)
    
    // Apply font size
    const fontSizes = { small: '90%', medium: '100%', large: '110%', extraLarge: '120%' }
    document.documentElement.style.fontSize = fontSizes[settings.fontSize]
    
    // Apply compact mode
    document.body.classList.toggle('compact-mode', settings.compactMode)
    
    // Set default view from settings
    setActiveView(settings.defaultView === 'day' ? 'Day' : settings.defaultView === 'month' ? 'Month' : 'Week')
  }, [settings.accentColor, settings.fontSize, settings.compactMode, settings.defaultView])

  // Apply dark mode class to html element
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  // Load test helper in development
  useEffect(() => {
    if (import.meta.env.DEV) {
      import('./test-notifications.js').catch(() => {})
    }
  }, [])

  // Initial loading state (shorter delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

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
        return (
          <DayView
            onEventClick={openEdit}
            onSlotClick={(date, time) => openAdd(date, time)}
            initialDate={selectedDate}
          />
        )
      case 'Month':
        return (
          <MonthView
            onEventClick={openEdit}
            onSlotClick={(date, time) => openAdd(date, time)}
            onNavigateToDay={navigateToDay}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className={`flex h-screen w-screen overflow-hidden font-sans ${isDark ? 'bg-sidebar-deep' : 'bg-light-bg'}`}>
      {/* Skip link for keyboard users */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-accent"
      >
        Skip to main content
      </a>
      
      {isInitialLoading ? (
        <div className="flex-1 flex items-center justify-center p-8" role="status" aria-label="Loading calendar">
          <div className="w-full max-w-6xl">
            <div className="mb-6 h-8 w-48 bg-light-card dark:bg-gray-800 rounded animate-pulse" />
            <LoadingSkeleton rows={8} />
          </div>
        </div>
      ) : (
        <>
          {/* Desktop sidebar - hidden on mobile */}
          <div className="flex-shrink-0 hidden md:block">
            <Sidebar onAddEvent={() => openAdd()} />
          </div>

          {/* Mobile sidebar drawer */}
          {isMobile && (
            <MobileDrawer
              isOpen={isSidebarOpen}
              onClose={closePanel}
              side="left"
              title="Menu"
            >
              <Sidebar onAddEvent={() => { openAdd(); closePanel(); }} />
            </MobileDrawer>
          )}

          {/* Main content area */}
          <main 
            id="main-content" 
            className={`flex flex-col flex-1 min-w-0 overflow-hidden ${isMobile ? 'pb-16' : ''}`} 
            role="main"
          >
            <TopBar
              activeView={activeView}
              setActiveView={setActiveView}
              onAddEvent={() => openAdd()}
              onWhatsAppSettings={() => setWhatsappSettingsOpen(true)}
              onSettings={() => setSettingsOpen(true)}
              onMenuClick={isMobile ? toggleSidebar : undefined}
              onChatClick={isMobile ? toggleChat : undefined}
              isMobile={isMobile}
            />
            <div className="flex-1 min-w-0 min-h-0 overflow-hidden bg-light-card dark:bg-[#1a1a2e] flex flex-col">
              {renderView()}
            </div>
          </main>

          {/* Desktop chat sidebar - hidden on mobile */}
          <div className="flex-shrink-0 hidden lg:block">
            <ChatSidebar />
          </div>

          {/* Mobile chat drawer */}
          {isMobile && (
            <MobileDrawer
              isOpen={isChatOpen}
              onClose={closePanel}
              side="right"
              title="AI Assistant"
            >
              <ChatSidebar />
            </MobileDrawer>
          )}

          {/* Mobile bottom navigation */}
          {isMobile && (
            <MobileNav
              activePanel={activePanel}
              onSidebarClick={toggleSidebar}
              onChatClick={toggleChat}
              onAddClick={() => openAdd()}
            />
          )}

          <EventModal
            isOpen={modal.open}
            onClose={closeModal}
            editEvent={modal.event}
            defaultDate={modal.date}
            defaultTime={modal.time}
          />

          <SettingsModal
            isOpen={settingsOpen}
            onClose={() => setSettingsOpen(false)}
          />

          <WhatsAppSettings 
            isOpen={whatsappSettingsOpen} 
            onClose={() => setWhatsappSettingsOpen(false)} 
          />

          <WhatsAppToast events={lastSyncedEvents} />
          <OfflineIndicator />
          <ToastContainer />
          <PWAInstallPrompt />
        </>
      )}
    </div>
  )
}

export default function App() {
  const { authEnabled } = useAuth()

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <CalendarApp />
          </ProtectedRoute>
        }
      />
      
      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
