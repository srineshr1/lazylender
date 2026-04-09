import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useDarkStore } from '../../store/useDarkStore'
import { useIsMobile } from '../../hooks/useMediaQuery'
import LoadingSpinner from '../LoadingSpinner'
import {
  connectWhatsApp,
  disconnectWhatsApp,
  logoutWhatsApp,
  getStatus,
  getGroups,
  getContacts,
  getWatchedGroups,
  setWatchedGroups,
  getCurrentUserId,
  getRecentMessages,
} from '../../api/whatsappClient'

const ACTIVE_PHASES = ['connecting', 'launching', 'authenticating']

const PHASE_LABELS = {
  connecting: 'Connecting to WhatsApp',
  launching: 'Launching browser session',
  authenticating: 'Finishing setup',
}

const PHASE_HINTS = {
  connecting: 'This usually takes 30–60 seconds',
  launching: 'Starting secure connection...',
  authenticating: 'Almost ready!',
}

function calcProgress(elapsedMs) {
  const t = elapsedMs / 1000
  if (t < 4) return (t / 4) * 35
  if (t < 15) return 35 + ((t - 4) / 11) * 25
  if (t < 60) return 60 + ((t - 15) / 45) * 25
  return 85
}

function statusMeta(connectPhase, isConnected) {
  if (isConnected || connectPhase === 'connected') return { label: 'Connected', tone: 'success' }
  if (['connecting', 'launching'].includes(connectPhase)) return { label: 'Connecting', tone: 'pending' }
  if (connectPhase === 'qr_ready') return { label: 'Scan QR', tone: 'pending' }
  if (connectPhase === 'authenticating') return { label: 'Authenticating', tone: 'pending' }
  if (connectPhase === 'timeout') return { label: 'Timed out', tone: 'warning' }
  if (connectPhase === 'error') return { label: 'Error', tone: 'danger' }
  return { label: 'Disconnected', tone: 'danger' }
}

function formatTime(ts) {
  if (!ts) return '--'
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function WhatsAppPopup({ onClose }) {
  const { isDark } = useDarkStore()
  const isMobile = useIsMobile()
  const popupRef = useRef(null)

  const [connectPhase, setConnectPhase] = useState('idle')
  const connectPhaseRef = useRef('idle')
  const connectStartTimeRef = useRef(null)
  const [progressPercent, setProgressPercent] = useState(0)
  const [dots, setDots] = useState('')

  const [qrCode, setQrCode] = useState(null)
  const [qrExpiryCountdown, setQrExpiryCountdown] = useState(0)

  const [isConnected, setIsConnected] = useState(false)
  const [sessionStatus, setSessionStatus] = useState('DISCONNECTED')
  const [statusMessage, setStatusMessage] = useState('Not connected')
  const [isLoadingInitial, setIsLoadingInitial] = useState(true)

  const [groups, setGroups] = useState([])
  const [contacts, setContacts] = useState([])
  const [watchedGroupIds, setWatchedGroupIds] = useState([])
  const [recentMessages, setRecentMessages] = useState([])
  const [isSavingGroup, setIsSavingGroup] = useState(false)
  const [isRefreshingGroups, setIsRefreshingGroups] = useState(false)
  const [isRefreshingMessages, setIsRefreshingMessages] = useState(false)

  const [error, setError] = useState(null)
  const [view, setView] = useState('groups')
  const [showAddPopup, setShowAddPopup] = useState(false)
  const [addPopupTab, setAddPopupTab] = useState('groups')
  const [isLoadingAdd, setIsLoadingAdd] = useState(false)
  const addPopupRef = useRef(null)

  const isActive = ACTIVE_PHASES.includes(connectPhase) || connectPhase === 'qr_ready'

  useEffect(() => { connectPhaseRef.current = connectPhase }, [connectPhase])

  const meta = useMemo(() => statusMeta(connectPhase, isConnected), [connectPhase, isConnected])

  useEffect(() => {
    if (!ACTIVE_PHASES.includes(connectPhase)) return
    const startTime = connectStartTimeRef.current
    if (!startTime) return
    function update() {
      const elapsed = Date.now() - startTime
      setProgressPercent(Math.min(calcProgress(elapsed), 85))
    }
    update()
    const interval = setInterval(update, 200)
    return () => clearInterval(interval)
  }, [connectPhase])

  useEffect(() => {
    if (!ACTIVE_PHASES.includes(connectPhase)) { setDots(''); return }
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.')
    }, 400)
    return () => clearInterval(interval)
  }, [connectPhase])

  useEffect(() => {
    if (!['connecting', 'launching'].includes(connectPhase)) return
    const timeout = setTimeout(() => {
      setConnectPhase('timeout')
    }, 120000)
    return () => clearTimeout(timeout)
  }, [connectPhase])

  useEffect(() => {
    if (connectPhase !== 'authenticating') return
    const timeout = setTimeout(() => {
      setConnectPhase('error')
      setError('Setup stalled after authentication. Please try reconnecting.')
    }, 30000)
    return () => clearTimeout(timeout)
  }, [connectPhase])

  useEffect(() => {
    if (!qrCode) return
    const timer = setInterval(() => {
      setQrExpiryCountdown(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [qrCode])

  useEffect(() => {
    if (!showAddPopup) return
    const handle = e => {
      if (addPopupRef.current && !addPopupRef.current.contains(e.target)) {
        setShowAddPopup(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showAddPopup])

  useEffect(() => {
    if (showAddPopup) return
    const handle = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        const wasActive = ['connecting', 'launching', 'qr_ready'].includes(connectPhaseRef.current)
        onClose()
        if (wasActive) disconnectWhatsApp().catch(() => {})
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose, showAddPopup])

  const fetchGroups = async ({ silent = false } = {}) => {
    if (!silent) setIsRefreshingGroups(true)
    try {
      const [fetchedGroups, fetchedContacts, watched] = await Promise.all([
        getGroups(), getContacts(), getWatchedGroups()
      ])
      setGroups(fetchedGroups)
      setContacts(fetchedContacts)
      setWatchedGroupIds(watched.map(g => g.id))
    } catch (err) {
      setError(err.message)
    } finally {
      if (!silent) setIsRefreshingGroups(false)
    }
  }

  const fetchMessages = async ({ silent = false } = {}) => {
    if (!silent) setIsRefreshingMessages(true)
    try {
      const [messages, watched] = await Promise.all([
        getRecentMessages(), getWatchedGroups()
      ])
      const watchedIds = new Set(watched.map(g => g.id))
      const filtered = messages.filter(msg => {
        if (watchedIds.size === 0) return false
        const chatId = msg.groupId || msg.from
        return watchedIds.has(chatId)
      })
      setRecentMessages(filtered.slice(0, 20))
    } catch (err) {
      setError(err.message)
    } finally {
      if (!silent) setIsRefreshingMessages(false)
    }
  }

  const fetchStatus = async ({ silent = false } = {}) => {
    try {
      const userId = getCurrentUserId()
      if (!userId) {
        setError('WhatsApp not registered. Please refresh the page.')
        setIsLoadingInitial(false)
        return
      }

      const status = await getStatus()
      const phase = connectPhaseRef.current

      setIsConnected(status.connected)
      setSessionStatus(status.sessionStatus || 'DISCONNECTED')
      setStatusMessage(status.message || 'Disconnected')

      if (status.connected) {
        if (phase !== 'connected') {
          setConnectPhase('connected')
          setProgressPercent(100)
        }
        setQrCode(null)
        setQrExpiryCountdown(0)
        setView('groups')
      } else if (status.qr) {
        if (phase !== 'qr_ready') setQrExpiryCountdown(45)
        setQrCode(status.qr)
        if (phase !== 'qr_ready') setProgressPercent(90)
        setConnectPhase('qr_ready')
      } else if (status.sessionStatus === 'AUTHENTICATING') {
        setConnectPhase('authenticating')
        setQrCode(null)
        setProgressPercent(92)
      } else if (status.sessionStatus === 'CONNECTING') {
        if (phase === 'connecting') {
          setConnectPhase('launching')
        } else if (phase === 'idle') {
          setConnectPhase('launching')
          connectStartTimeRef.current = Date.now() - 3000
        }
      } else if (phase === 'qr_ready' && !status.qr && status.sessionStatus !== 'AUTHENTICATING') {
        // QR refreshing — keep phase, don't clear qrCode immediately
      } else if (status.sessionStatus === 'DISCONNECTED' || status.sessionStatus === 'FAILED') {
        if (!['idle', 'error', 'timeout', 'connecting', 'launching', 'authenticating'].includes(phase)) {
          setConnectPhase('idle')
          setProgressPercent(0)
        }
        if (phase !== 'qr_ready') {
          setQrCode(null)
          setQrExpiryCountdown(0)
        }
      }

      if (!silent) setError(null)
    } catch (err) {
      const phase = connectPhaseRef.current
      if (['connecting', 'launching', 'authenticating'].includes(phase)) {
        setConnectPhase('error')
      }
      setError(err.message)
    } finally {
      setIsLoadingInitial(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const intervalMs = isActive ? 1000 : 5000
    const interval = setInterval(() => {
      if (!isConnected || isActive) fetchStatus({ silent: true })
      if (isConnected) fetchMessages({ silent: true })
    }, intervalMs)
    return () => clearInterval(interval)
  }, [isConnected, connectPhase])

  useEffect(() => {
    if (isConnected) {
      fetchGroups({ silent: true })
      fetchMessages({ silent: true })
    }
  }, [isConnected])

  const handleConnect = async () => {
    if (isConnected || isActive) return
    setConnectPhase('connecting')
    setProgressPercent(0)
    setQrCode(null)
    setQrExpiryCountdown(0)
    setError(null)
    connectStartTimeRef.current = Date.now()
    try {
      await connectWhatsApp()
    } catch (err) {
      if (connectPhaseRef.current === 'connecting') {
        setConnectPhase('error')
        setError(err.message)
      }
    }
  }

  const handleCancelConnect = async () => {
    try { await disconnectWhatsApp() } catch {}
    setConnectPhase('idle')
    setProgressPercent(0)
    setQrCode(null)
    setQrExpiryCountdown(0)
    setError(null)
  }

  const handleRetryConnect = () => {
    setConnectPhase('idle')
    setError(null)
    setProgressPercent(0)
    setQrCode(null)
    setQrExpiryCountdown(0)
  }

  const handleDisconnect = async () => {
    try {
      await disconnectWhatsApp()
      setConnectPhase('idle')
      setProgressPercent(0)
      setIsConnected(false)
      setQrCode(null)
      setGroups([])
      setRecentMessages([])
      setWatchedGroupIds([])
      setView('groups')
      setSessionStatus('DISCONNECTED')
      setStatusMessage('Disconnected')
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to logout? You will need to scan the QR code again to reconnect.')) return
    try {
      await logoutWhatsApp()
      setConnectPhase('idle')
      setProgressPercent(0)
      setIsConnected(false)
      setQrCode(null)
      setGroups([])
      setRecentMessages([])
      setWatchedGroupIds([])
      setView('groups')
      setSessionStatus('DISCONNECTED')
      setStatusMessage('Logged out')
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleOpenAddPopup = async () => {
    setShowAddPopup(true)
    setIsLoadingAdd(true)
    try {
      const [fetchedGroups, fetchedContacts] = await Promise.all([getGroups(), getContacts()])
      setGroups(fetchedGroups)
      setContacts(fetchedContacts)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoadingAdd(false)
    }
  }

  const handleAddItem = async (item) => {
    if (isSavingGroup || watchedGroupIds.includes(item.id)) return
    const nextIds = [...watchedGroupIds, item.id]
    setWatchedGroupIds(nextIds)
    setIsSavingGroup(true)
    try {
      const allItems = [...groups, ...contacts]
      const watchedItems = allItems.filter(g => nextIds.includes(g.id))
      await setWatchedGroups(watchedItems)
    } catch (err) {
      setError(err.message)
      setWatchedGroupIds(watchedGroupIds)
    } finally {
      setIsSavingGroup(false)
    }
  }

  const handleRemoveItem = async (itemId) => {
    if (isSavingGroup) return
    const nextIds = watchedGroupIds.filter(id => id !== itemId)
    setWatchedGroupIds(nextIds)
    setIsSavingGroup(true)
    try {
      const allItems = [...groups, ...contacts]
      const watchedItems = allItems.filter(g => nextIds.includes(g.id))
      await setWatchedGroups(watchedItems)
    } catch (err) {
      setError(err.message)
      setWatchedGroupIds(watchedGroupIds)
    } finally {
      setIsSavingGroup(false)
    }
  }

  const panelClass = 'glass-panel text-[color:var(--theme-text-primary)]'
  const subClass = 'theme-text-secondary'
  const cardClass = 'glass-subtle border-[color:var(--theme-border)]'
  const toneClass = {
    success: 'bg-green-500',
    pending: 'bg-yellow-500 animate-pulse',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  }[meta.tone]
  const validCount = recentMessages.filter(m => m.isValidUpcomingEvent).length

  return (
    <>
      <div
        ref={popupRef}
        className={`fixed inset-x-3 top-16 w-auto max-w-[420px] rounded-2xl shadow-2xl border animate-popIn z-50 overflow-hidden md:absolute md:inset-x-auto md:top-14 md:right-4 md:w-[400px] ${panelClass}`}
        style={{ maxHeight: '82vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[color:var(--theme-border)]">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-semibold theme-text-primary">WhatsApp</h3>
            <div className={`w-2 h-2 rounded-full ${toneClass}`} />
          </div>
          <button
            onClick={() => {
              const wasActive = ['connecting', 'launching', 'qr_ready'].includes(connectPhase)
              onClose()
              if (wasActive) disconnectWhatsApp().catch(() => {})
            }}
            className="p-1.5 rounded-lg theme-icon-btn"
          >
            <svg className={`w-4 h-4 ${subClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(82vh - 80px)' }}>
          {/* Error banner (not shown in error/timeout phase — those have their own UI) */}
          {error && connectPhase !== 'error' && connectPhase !== 'timeout' && (
            <div className={`p-3 rounded-lg border text-xs ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-red-50 border-red-200 text-red-600'}`}>
              {error}
            </div>
          )}

          {/* ---- Disconnected / Connecting States ---- */}
          {!isConnected && (
            <div className={`rounded-xl border p-4 ${cardClass}`}>
              {isLoadingInitial ? (
                <div className="flex flex-col items-center py-8">
                  <LoadingSpinner size="md" label="Checking WhatsApp status" />
                </div>
              ) : isMobile ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-semibold theme-text-primary mb-2">Use Desktop to Connect</h4>
                  <p className={`text-xs ${subClass} max-w-[280px]`}>
                    WhatsApp connection requires scanning a QR code with your phone. Please use the desktop version.
                  </p>
                </div>
              ) : connectPhase === 'idle' ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Connection status</p>
                    <p className={`text-xs mt-1 ${subClass}`}>{statusMessage}</p>
                  </div>
                  <button
                    onClick={handleConnect}
                    disabled={isActive}
                    className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#25D366] hover:bg-[#20BD5A] text-white disabled:opacity-50 transition-colors"
                  >
                    Connect WhatsApp
                  </button>
                </div>
              ) : ACTIVE_PHASES.includes(connectPhase) ? (
                <div className="flex flex-col items-center py-6">
                  <div className="relative mb-5">
                    <div className="w-16 h-16 rounded-full bg-[#25D366]/15 flex items-center justify-center animate-whatsappPulse">
                      <svg className="w-8 h-8 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.243-1.214L4 20l1.214-3.757A8 8 0 0112 4c4.411 0 8 3.589 8 8s-3.589 8-8 8z"/>
                        <path d="M8.5 14a.5.5 0 01-.354-.854l7-7a.5.5 0 01.708.708l-7 7A.498.498 0 018.5 14z"/>
                      </svg>
                    </div>
                    <div className="absolute inset-0 rounded-full border-2 border-[#25D366]/20 animate-whatsappRing" />
                  </div>
                  <p className="text-sm font-semibold theme-text-primary mb-1">
                    {PHASE_LABELS[connectPhase]}{dots}
                  </p>
                  <p className={`text-xs ${subClass} mb-4`}>
                    {PHASE_HINTS[connectPhase]}
                  </p>
                  <div className="w-56 h-1.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-full bg-[#25D366] rounded-full transition-[width] duration-300 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <button
                    onClick={handleCancelConnect}
                    className="text-xs text-red-400 hover:text-red-500 mt-4 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : connectPhase === 'qr_ready' ? (
                <div className="flex flex-col items-center py-4">
                  {qrCode ? (
                    <>
                      <div className="bg-white rounded-2xl p-5 shadow-lg">
                        <QRCodeSVG value={qrCode} size={220} level="M" includeMargin={false} bgColor="#ffffff" fgColor="#000000" />
                      </div>
                      <p className={`text-xs mt-4 ${subClass} text-center max-w-[280px]`}>
                        Open WhatsApp → Linked Devices → Scan this code
                      </p>
                      {qrExpiryCountdown > 0 && (
                        <p className={`text-xs mt-1.5 ${qrExpiryCountdown <= 10 ? 'text-amber-500' : subClass}`}>
                          Expires in {qrExpiryCountdown}s
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center py-6">
                      <LoadingSpinner size="md" label="Generating QR code" />
                      <p className={`text-xs mt-3 ${subClass}`}>New QR code generating...</p>
                    </div>
                  )}
                </div>
              ) : connectPhase === 'timeout' ? (
                <div className="flex flex-col items-center py-6">
                  <div className="w-14 h-14 rounded-full bg-amber-500/15 flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold theme-text-primary mb-1">Connection timed out</p>
                  <p className={`text-xs ${subClass} text-center max-w-[260px] mb-4`}>
                    WhatsApp took too long to respond. This can happen on first connection or when the server is busy.
                  </p>
                  <button
                    onClick={handleRetryConnect}
                    className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#25D366] hover:bg-[#20BD5A] text-white transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : connectPhase === 'error' ? (
                <div className="flex flex-col items-center py-6">
                  <div className="w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold theme-text-primary mb-1">Connection failed</p>
                  <p className={`text-xs ${subClass} text-center max-w-[260px] mb-4`}>
                    {error || 'Something went wrong. Please try again.'}
                  </p>
                  <button
                    onClick={handleRetryConnect}
                    className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#25D366] hover:bg-[#20BD5A] text-white transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {/* ---- Connected State ---- */}
          {isConnected && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium theme-text-secondary">{statusMessage}</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDisconnect}
                    className="text-xs px-3 py-1.5 rounded-lg theme-control press-feedback"
                  >
                    Disconnect
                  </button>
                  <button
                    onClick={handleLogout}
                    className="text-xs px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>

              {/* Tab Switcher */}
              <div className="flex gap-2 p-1 rounded-lg glass-subtle">
                {['groups', 'messages'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setView(tab)}
                    className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${
                      view === tab ? 'theme-control-active' : 'theme-text-secondary theme-hover-text'
                    }`}
                  >
                    {tab === 'groups' ? 'Being monitored' : `Messages (${validCount})`}
                  </button>
                ))}
              </div>

              {/* Groups View */}
              {view === 'groups' && (
                <div className={`rounded-xl border p-3 ${cardClass}`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold">
                      {watchedGroupIds.length > 0
                        ? `Watching ${watchedGroupIds.length} item${watchedGroupIds.length === 1 ? '' : 's'}`
                        : 'No groups or chats monitored'
                      }
                    </p>
                    <button
                      onClick={handleOpenAddPopup}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20BD5A] text-white transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add
                    </button>
                  </div>

                  {watchedGroupIds.length === 0 ? (
                    <p className={`text-xs text-center py-6 ${subClass}`}>
                      Click "Add" to select groups or contacts to monitor for upcoming events and tasks.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {[...groups, ...contacts]
                        .filter(item => watchedGroupIds.includes(item.id))
                        .map((item) => {
                          const isGroup = groups.some(g => g.id === item.id)
                          return (
                            <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg glass-subtle">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                isGroup ? 'bg-[#25D366]/20' : 'bg-blue-500/20'
                              }`}>
                                <svg className={`w-4 h-4 ${isGroup ? 'text-[#25D366]' : 'text-blue-400'}`} fill="currentColor" viewBox="0 0 24 24">
                                  <path d={isGroup
                                    ? "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-6 8c0-2.67 5.33-4 6-4s6 1.33 6 4v1H6v-1zm12-8c0-.55.45-1 1-1h4c.55 0 1 .45 1 1s-.45 1-1 1h-4c-.55 0-1-.45-1-1z"
                                    : "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                                  } />
                                </svg>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium truncate">{item.name}</p>
                                <p className={`text-[10px] ${subClass}`}>
                                  {isGroup
                                    ? `${item.participantCount || 0} members · ${item.messageCount || 0} msgs`
                                    : `Contact · ${item.messageCount || 0} msgs`
                                  }
                                </p>
                              </div>
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                disabled={isSavingGroup}
                                className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
                                title="Remove from monitoring"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* Messages View */}
              {view === 'messages' && (
                <div className={`rounded-xl border p-3 ${cardClass}`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold">Recent messages</p>
                    <button
                      onClick={() => fetchMessages()}
                      disabled={isRefreshingMessages}
                      className="text-xs px-3 py-1.5 rounded-lg theme-control press-feedback disabled:opacity-50"
                    >
                      {isRefreshingMessages ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>

                  {recentMessages.length === 0 ? (
                    <p className={`text-xs ${subClass}`}>No recent messages captured yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {recentMessages.map((message) => (
                        <div key={message.id} className="rounded-lg p-2 border glass-subtle">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-xs font-semibold truncate">{message.groupName}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                              message.isValidUpcomingEvent
                                ? isDark ? 'bg-green-500/20 text-green-300' : 'bg-green-50 text-green-700'
                                : isDark ? 'bg-gray-500/20 text-gray-300' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {message.isValidUpcomingEvent ? `Valid (${message.extractedEvents})` : 'No upcoming event'}
                            </span>
                          </div>
                          <p className={`text-xs ${subClass} line-clamp-2`}>{message.text || 'Media message'}</p>
                          <p className={`text-[10px] mt-1 ${subClass}`}>{formatTime(message.timestamp)} · {message.messageType}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Groups/Contacts Popup */}
      {showAddPopup && createPortal(
        <div className="fixed inset-0 z-[60] glass-backdrop flex items-center justify-center">
          <div ref={addPopupRef} className={`w-96 max-h-[80vh] rounded-2xl glass-panel glass-modal shadow-2xl flex flex-col`}>
            <div className="flex items-center justify-between p-4 border-b border-[color:var(--theme-border)]">
              <h3 className="text-base font-semibold">Add to monitor</h3>
              <button onClick={() => setShowAddPopup(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex gap-2 p-3 border-b border-[color:var(--theme-border)]">
              {['groups', 'chats'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setAddPopupTab(tab)}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    addPopupTab === tab ? 'bg-[#25D366] text-white shadow-lg' : 'glass-subtle theme-text-secondary hover:theme-text-primary hover:scale-[1.02]'
                  }`}
                >
                  {tab === 'groups' ? `Groups (${groups.length})` : `Chats (${contacts.length})`}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {isLoadingAdd ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <div className="space-y-2">
                  {(addPopupTab === 'groups' ? groups : contacts)
                    .filter(item => !watchedGroupIds.includes(item.id))
                    .map((item) => {
                      const isGroup = addPopupTab === 'groups'
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleAddItem(item)}
                          disabled={isSavingGroup}
                          className="w-full flex items-center gap-3 p-3 rounded-xl glass-subtle hover:bg-white/10 transition-all hover:scale-[1.01] hover:shadow-md text-left disabled:opacity-50 border border-transparent hover:border-[#25D366]/30"
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${
                            isGroup ? 'bg-[#25D366]/20' : 'bg-blue-500/20'
                          }`}>
                            <svg className={`w-5 h-5 ${isGroup ? 'text-[#25D366]' : 'text-blue-400'}`} fill="currentColor" viewBox="0 0 24 24">
                              <path d={isGroup
                                ? "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-6 8c0-2.67 5.33-4 6-4s6 1.33 6 4v1H6v-1zm12-8c0-.55.45-1 1-1h4c.55 0 1 .45 1 1s-.45 1-1 1h-4c-.55 0-1-.45-1-1z"
                                : "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                              } />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className={`text-[11px] ${subClass} mt-0.5`}>
                              {isGroup
                                ? `${item.participantCount || 0} members · ${item.messageCount || 0} msgs`
                                : `${item.messageCount || 0} messages`
                              }
                            </p>
                          </div>
                          <svg className="w-5 h-5 text-[#25D366] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      )
                    })}
                  {(addPopupTab === 'groups' ? groups : contacts).filter(item => !watchedGroupIds.includes(item.id)).length === 0 && (
                    <p className={`text-sm text-center py-8 ${subClass}`}>
                      {addPopupTab === 'groups'
                        ? groups.length === 0 ? 'No groups found' : 'All groups are being monitored'
                        : contacts.length === 0 ? 'No chats found' : 'All chats are being monitored'
                      }
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}