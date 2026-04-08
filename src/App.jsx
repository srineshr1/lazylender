import React, { useState, useEffect, useRef, lazy, Suspense } from 'react'
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
import { useWhatsAppSync } from './hooks/useWhatsAppSync'
import { useNotificationTriggers } from './hooks/useNotificationTriggers'
import { useMobileLayout } from './hooks/useMobileLayout'
import { useEventStore } from './store/useEventStore'
import { useDarkStore } from './store/useDarkStore'
import { useSettingsStore } from './store/useSettingsStore'
import { useChatStore } from './store/useChatStore'
import { useAuth } from './contexts/AuthContext'
import { getBlurLevel } from './lib/performanceDetection'

const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
import getSupabaseClient from './lib/supabase'

function CalendarApp() {
  const getEffectiveBlurLevel = useSettingsStore((state) => state.getEffectiveBlurLevel)
  const settings = useSettingsStore()
  const [activeView, setActiveView] = useState('Week')
  const [modal, setModal] = useState({ open: false, event: null, date: null, time: null })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [whatsappSettingsOpen, setWhatsappSettingsOpen] = useState(false)
  const { events } = useEventStore()
  const { isDark, setIsDark } = useDarkStore()
  const { lastSyncedEvents } = useWhatsAppSync()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const { user, authEnabled } = useAuth()
  const supabase = getSupabaseClient()

  // Track whether we've applied the initial default view from settings
  const hasAppliedDefaultView = useRef(false)
  
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

  // Desktop floating chat state
  const [isFloatingChatOpen, setIsFloatingChatOpen] = useState(false)
  
  // Navigate to day view
  const navigateToDay = (date) => {
    setSelectedDate(date)
    setActiveView('Day')
  }

  // Jump to today in all views
  const handleTodayClick = () => {
    const today = new Date()
    setSelectedDate(today)
    // Jump week view to current week
    useEventStore.getState().jumpToDate(today)
    // If in day view, update to today
    if (activeView === 'Day') {
      setSelectedDate(today)
    }
  }
  
  // Initialize Supabase data when user logs in
  useEffect(() => {
    if (supabase && user && authEnabled) {
      let chatSub, settingsSub
      
      const initializeStores = async () => {
        console.log('[App] Initializing stores for user:', user.id)
        
        // Detect device performance and set blur level
        const detectedBlurLevel = getBlurLevel()
        useSettingsStore.getState().initializeBlurSettings(detectedBlurLevel)
        
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

  // Apply theme/visual settings (colors, fonts, compact mode) whenever they change
  // NOTE: defaultView is intentionally excluded here — it's only applied once on mount
  useEffect(() => {
    const themePresets = {
      royal: {
        light: {
          surface: '#fcfbf8',
          surfaceAlt: '#f3efe6',
          panel: '#ffffff',
          border: '#dfd4c4',
          textPrimary: '#2a2a2f',
          textSecondary: '#686067',
          eventColors: {
            pink: { bg: '#f8e9f0', border: '#cc6b95', text: '#4f2238' },
            green: { bg: '#e8f4ec', border: '#47906b', text: '#1d4b35' },
            blue: { bg: '#e8edf8', border: '#4f72c7', text: '#1f3569' },
            amber: { bg: '#f8f0e2', border: '#b9853f', text: '#5b3a12' },
            gray: { bg: '#ececf0', border: '#7e8093', text: '#2a2c34' },
          },
        },
        dark: {
          surface: '#16141c',
          surfaceAlt: '#1f1b28',
          panel: '#262131',
          border: '#3a3148',
          textPrimary: '#f2ecff',
          textSecondary: '#c3bbd7',
          eventColors: {
            pink: { bg: '#3f2733', border: '#d18daf', text: '#ffe7f1' },
            green: { bg: '#1f3a30', border: '#66b18a', text: '#d8ffec' },
            blue: { bg: '#1e2f4d', border: '#7ca2f0', text: '#deebff' },
            amber: { bg: '#41321d', border: '#d3a866', text: '#ffefd9' },
            gray: { bg: '#2a2b35', border: '#a5a8bd', text: '#f0f2ff' },
          },
        },
      },
      emerald: {
        light: {
          surface: '#f8fbf5',
          surfaceAlt: '#eaf3e3',
          panel: '#ffffff',
          border: '#cdddc3',
          textPrimary: '#1f2c24',
          textSecondary: '#5a6f63',
          eventColors: {
            pink: { bg: '#f8ecef', border: '#c57f92', text: '#4f2a34' },
            green: { bg: '#e5f6ec', border: '#3f9968', text: '#165035' },
            blue: { bg: '#e6f1f7', border: '#4f88b7', text: '#17384f' },
            amber: { bg: '#f7f2df', border: '#b79344', text: '#564312' },
            gray: { bg: '#edf1ec', border: '#7b8a7d', text: '#2a332d' },
          },
        },
        dark: {
          surface: '#131b18',
          surfaceAlt: '#1b2924',
          panel: '#22342d',
          border: '#2f4b41',
          textPrimary: '#e9fff1',
          textSecondary: '#b0d5c1',
          eventColors: {
            pink: { bg: '#3f2831', border: '#cb8a9e', text: '#ffe7ee' },
            green: { bg: '#1f3f32', border: '#6fca9d', text: '#ddffee' },
            blue: { bg: '#1d3742', border: '#79b2d6', text: '#d9f2ff' },
            amber: { bg: '#40361f', border: '#d6b477', text: '#fff1d8' },
            gray: { bg: '#2a3630', border: '#a0b4a8', text: '#ecfff2' },
          },
        },
      },
      rose: {
        light: {
          surface: '#fff9f8',
          surfaceAlt: '#faece8',
          panel: '#ffffff',
          border: '#e7cec7',
          textPrimary: '#2f2224',
          textSecondary: '#7a5f64',
          eventColors: {
            pink: { bg: '#fde9f0', border: '#c9668f', text: '#5c223a' },
            green: { bg: '#edf5ef', border: '#5a8f6b', text: '#224731' },
            blue: { bg: '#eceff8', border: '#667fbe', text: '#28365f' },
            amber: { bg: '#f9efdf', border: '#bf8a3e', text: '#633d10' },
            gray: { bg: '#f1ecee', border: '#93808a', text: '#362c31' },
          },
        },
        dark: {
          surface: '#1b1517',
          surfaceAlt: '#271d21',
          panel: '#32242a',
          border: '#4c343d',
          textPrimary: '#ffedf0',
          textSecondary: '#d9b7bf',
          eventColors: {
            pink: { bg: '#4b2737', border: '#e18db0', text: '#ffe6f0' },
            green: { bg: '#263830', border: '#84bf9b', text: '#e1fff0' },
            blue: { bg: '#293246', border: '#94aee8', text: '#e7eeff' },
            amber: { bg: '#453222', border: '#d5a569', text: '#ffefd9' },
            gray: { bg: '#3a2f36', border: '#b6a2aa', text: '#fff0f5' },
          },
        },
      },
      ocean: {
        light: {
          surface: '#f7fbfc',
          surfaceAlt: '#e8f1f4',
          panel: '#ffffff',
          border: '#c9d9df',
          textPrimary: '#1f2931',
          textSecondary: '#556873',
          eventColors: {
            pink: { bg: '#f8eaf0', border: '#c47d98', text: '#4d2a3a' },
            green: { bg: '#e8f3ef', border: '#4d9178', text: '#1e4a3a' },
            blue: { bg: '#e4f2f8', border: '#4e8eb5', text: '#1a4358' },
            amber: { bg: '#f7f1e1', border: '#ba9544', text: '#56420f' },
            gray: { bg: '#e8eef2', border: '#748b99', text: '#25323b' },
          },
        },
        dark: {
          surface: '#12181c',
          surfaceAlt: '#1a252b',
          panel: '#23323a',
          border: '#32505b',
          textPrimary: '#e9f8ff',
          textSecondary: '#aec8d5',
          eventColors: {
            pink: { bg: '#412a35', border: '#cf8aa4', text: '#ffe8f1' },
            green: { bg: '#1f3a34', border: '#71b79f', text: '#dcfff2' },
            blue: { bg: '#1f3c4a', border: '#7bc4e7', text: '#def4ff' },
            amber: { bg: '#3d3523', border: '#d5b274', text: '#fff0da' },
            gray: { bg: '#2a3942', border: '#9eb8c7', text: '#edf8ff' },
          },
        },
      },
    }

    const preset = themePresets[settings.themePreset] || themePresets.royal
    const palette = isDark ? preset.dark : preset.light

    document.documentElement.style.setProperty('--color-accent', settings.accentColor)
    document.documentElement.style.setProperty('--theme-surface', palette.surface)
    document.documentElement.style.setProperty('--theme-surface-alt', palette.surfaceAlt)
    document.documentElement.style.setProperty('--theme-panel', palette.panel)
    document.documentElement.style.setProperty('--theme-border', palette.border)
    document.documentElement.style.setProperty('--theme-text-primary', palette.textPrimary)
    document.documentElement.style.setProperty('--theme-text-secondary', palette.textSecondary)
    document.documentElement.style.setProperty('--calendar-line', isDark ? 'rgba(195, 187, 215, 0.12)' : 'rgba(104, 96, 103, 0.18)')
    document.documentElement.style.setProperty('--calendar-line-strong', isDark ? 'rgba(195, 187, 215, 0.18)' : 'rgba(104, 96, 103, 0.28)')
    document.documentElement.style.setProperty('--calendar-sleep-fill', isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.05)')

    Object.entries(palette.eventColors || {}).forEach(([key, tones]) => {
      document.documentElement.style.setProperty(`--event-${key}-bg`, tones.bg)
      document.documentElement.style.setProperty(`--event-${key}-border`, tones.border)
      document.documentElement.style.setProperty(`--event-${key}-text`, tones.text)
    })

    // Apply font size
    const fontSizes = { small: '90%', medium: '100%', large: '110%', extraLarge: '120%' }
    document.documentElement.style.fontSize = fontSizes[settings.fontSize]
    
    // Apply compact mode
    document.body.classList.toggle('compact-mode', settings.compactMode)
  }, [
    isDark,
    settings.accentColor,
    settings.themePreset,
    settings.fontSize,
    settings.compactMode,
  ])

  // Apply defaultView only once on initial mount (or when user explicitly changes it in settings)
  useEffect(() => {
    if (!hasAppliedDefaultView.current) {
      hasAppliedDefaultView.current = true
      setActiveView(
        settings.defaultView === 'day' ? 'Day'
        : settings.defaultView === 'month' ? 'Month'
        : 'Week'
      )
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply dark mode class to html element
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  // Apply blur level to html element based on settings
  useEffect(() => {
    const effectiveBlurLevel = getEffectiveBlurLevel()
    document.documentElement.setAttribute('data-blur-level', effectiveBlurLevel)
  }, [settings.blurEnabled, settings.blurOverride, settings.deviceBlurLevel, getEffectiveBlurLevel])

  // Load test helper in development (disabled - file missing)
  // useEffect(() => {
  //   if (import.meta.env.DEV) {
  //     import('./test-notifications.js').catch(() => {})
  //   }
  // }, [])

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
            onNavigateToDay={navigateToDay}
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
      
      <>
          {/* Desktop sidebar - hidden on mobile */}
          <div className="flex-shrink-0 hidden md:block">
            <Sidebar onAddEvent={() => openAdd()} onImportTimetable={() => setIsFloatingChatOpen(true)} />
          </div>

          {/* Mobile sidebar drawer */}
          {isMobile && (
            <MobileDrawer
              isOpen={isSidebarOpen}
              onClose={closePanel}
              side="left"
              title="Menu"
            >
              <Sidebar onAddEvent={() => { openAdd(); closePanel(); }} onImportTimetable={() => { toggleChat(); closePanel(); }} />
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
              onChatClick={() => setIsFloatingChatOpen(v => !v)}
              isMobile={isMobile}
            />
            <div className="flex-1 min-w-0 min-h-0 overflow-hidden bg-light-card dark:bg-[#1a1a2e] flex flex-col">
              {renderView()}
            </div>
          </main>

          {/* Desktop floating chat toggle button */}
          {!isMobile && !isFloatingChatOpen && (
            <button
              onClick={() => setIsFloatingChatOpen(true)}
              className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-accent shadow-lg hover:bg-accent/90 transition-all flex items-center justify-center z-40"
              aria-label="Open AI chat"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </button>
          )}

          {/* Desktop floating chat - shown when open */}
          {!isMobile && isFloatingChatOpen && (
            <div className="fixed bottom-6 right-6 z-40">
              <ChatSidebar onClose={() => setIsFloatingChatOpen(false)} />
            </div>
          )}

          {/* Mobile chat drawer */}
          {isMobile && (
            <MobileDrawer
              isOpen={isChatOpen}
              onClose={closePanel}
              side="right"
              title="AI Assistant"
            >
              <ChatSidebar onClose={closePanel} />
            </MobileDrawer>
          )}

          {/* Mobile bottom navigation */}
          {isMobile && (
            <MobileNav
              activePanel={activePanel}
              onSidebarClick={toggleSidebar}
              onChatClick={toggleChat}
              onTodayClick={handleTodayClick}
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
    </div>
  )
}

export default function App() {
  const { authEnabled } = useAuth()

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-light-bg dark:bg-sidebar">Loading...</div>}>
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
    </Suspense>
  )
}
