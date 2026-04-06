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

function statusMeta(sessionStatus, connected) {
  if (connected) return { label: 'Connected', tone: 'success' }
  if (sessionStatus === 'CONNECTING' || sessionStatus === 'AUTHENTICATING' || sessionStatus === 'RECONNECTING') {
    return { label: 'Connecting', tone: 'pending' }
  }
  if (sessionStatus === 'QR_EXPIRED') return { label: 'QR Expired', tone: 'warning' }
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

  const [connecting, setConnecting] = useState(false)
  const [isRefreshingGroups, setIsRefreshingGroups] = useState(false)
  const [isRefreshingMessages, setIsRefreshingMessages] = useState(false)
  const [isLoadingInitial, setIsLoadingInitial] = useState(true)

  const [qrCode, setQrCode] = useState(null)
  const [qrExpiryCountdown, setQrExpiryCountdown] = useState(0)
  const [qrAttempts, setQrAttempts] = useState(0)
  const [maxQrAttempts, setMaxQrAttempts] = useState(3)

  const [isConnected, setIsConnected] = useState(false)
  const [sessionStatus, setSessionStatus] = useState('DISCONNECTED')
  const [statusMessage, setStatusMessage] = useState('Not connected')

  const [groups, setGroups] = useState([])
  const [contacts, setContacts] = useState([])
  const [watchedGroupIds, setWatchedGroupIds] = useState([])
  const [recentMessages, setRecentMessages] = useState([])
  const [isSavingGroup, setIsSavingGroup] = useState(false)

  const [error, setError] = useState(null)
  const [view, setView] = useState('groups')
  const [showAddPopup, setShowAddPopup] = useState(false)
  const [addPopupTab, setAddPopupTab] = useState('groups')
  const [isLoadingAdd, setIsLoadingAdd] = useState(false)
  const [hasAttemptedAutoConnect, setHasAttemptedAutoConnect] = useState(false)
  const addPopupRef = useRef(null)

  const meta = useMemo(() => statusMeta(sessionStatus, isConnected), [sessionStatus, isConnected])

  // Close add popup when clicking outside
  useEffect(() => {
    if (!showAddPopup) return
    const handleClickOutsideAdd = (e) => {
      if (addPopupRef.current && !addPopupRef.current.contains(e.target)) {
        setShowAddPopup(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutsideAdd)
    return () => document.removeEventListener('mousedown', handleClickOutsideAdd)
  }, [showAddPopup])

  useEffect(() => {
    if (showAddPopup) return // Don't handle clicks when add popup is open
    
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose()
        if (qrCode || connecting) {
          handleStop()
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose, qrCode, connecting, showAddPopup])

  useEffect(() => {
    if (!qrCode) return
    const timer = setInterval(() => {
      setQrExpiryCountdown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [qrCode])

  const fetchGroups = async ({ silent = false } = {}) => {
    if (!silent) setIsRefreshingGroups(true)
    try {
      const [fetchedGroups, fetchedContacts, watched] = await Promise.all([
        getGroups(), 
        getContacts(),
        getWatchedGroups()
      ])
      setGroups(fetchedGroups)
      setContacts(fetchedContacts)
      setWatchedGroupIds(watched.map((g) => g.id))
    } catch (err) {
      setError(err.message)
    } finally {
      if (!silent) setIsRefreshingGroups(false)
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
      // Combine groups and contacts that are being watched
      const allItems = [...groups, ...contacts]
      const watchedItems = allItems.filter((g) => nextIds.includes(g.id))
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
    
    const nextIds = watchedGroupIds.filter((id) => id !== itemId)
    setWatchedGroupIds(nextIds)
    setIsSavingGroup(true)
    
    try {
      const allItems = [...groups, ...contacts]
      const watchedItems = allItems.filter((g) => nextIds.includes(g.id))
      await setWatchedGroups(watchedItems)
    } catch (err) {
      setError(err.message)
      setWatchedGroupIds(watchedGroupIds)
    } finally {
      setIsSavingGroup(false)
    }
  }

  const fetchMessages = async ({ silent = false } = {}) => {
    if (!silent) setIsRefreshingMessages(true)
    try {
      const [messages, watched] = await Promise.all([
        getRecentMessages(),
        getWatchedGroups()
      ])
      
      // Filter messages to only show those from watched groups/contacts
      const watchedIds = new Set(watched.map(g => g.id))
      const filteredMessages = messages.filter(msg => {
        // If no watched groups, show nothing
        if (watchedIds.size === 0) return false
        // Check if message is from a watched group/contact
        const chatId = msg.groupId || msg.from
        return watchedIds.has(chatId)
      })
      
      setRecentMessages(filteredMessages.slice(0, 20))
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

      setQrAttempts(status.qrAttempts || 0)
      setMaxQrAttempts(status.maxQrAttempts || 3)
      setIsConnected(status.connected)
      setSessionStatus(status.sessionStatus || 'DISCONNECTED')
      setStatusMessage(status.message || 'Disconnected')

      if (status.qr && !qrCode) {
        setQrExpiryCountdown(45)
      }

      if (!status.qr) {
        setQrExpiryCountdown(0)
      }

      setQrCode(status.qr || null)

      if (status.connected) {
        setView('groups')
      }

      if (!silent) setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoadingInitial(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    
    // Poll faster (1s) when waiting for QR scan, slower (5s) when connected
    const isWaitingForScan = qrCode || connecting
    const pollInterval = isWaitingForScan ? 1000 : 5000
    
    const interval = setInterval(() => {
      // Only poll status when needed
      if (!isConnected || qrCode || connecting) {
        fetchStatus({ silent: true })
      }
      if (isConnected) {
        fetchMessages({ silent: true })
      }
    }, pollInterval)

    return () => clearInterval(interval)
  }, [isConnected, qrCode, connecting])

  useEffect(() => {
    if (isConnected) {
      fetchGroups({ silent: true })
      fetchMessages({ silent: true })
    }
  }, [isConnected])

  useEffect(() => {
    const autoConnect = async () => {
      if (hasAttemptedAutoConnect) return
      const userId = getCurrentUserId()
      if (!userId) return

      try {
        const status = await getStatus()
        if (!status.connected && !status.sessionActive && status.sessionStatus === 'DISCONNECTED') {
          setHasAttemptedAutoConnect(true)
        }
      } catch {
        // no-op
      }
    }

    autoConnect()
  }, [hasAttemptedAutoConnect])

  const handleConnect = async () => {
    // Early return if already connected
    if (isConnected) {
      console.warn('Already connected to WhatsApp')
      return
    }
    
    setConnecting(true)
    setError(null)
    setQrCode(null)
    setQrExpiryCountdown(0)
    setQrAttempts(0)
    try {
      await connectWhatsApp()
      await fetchStatus({ silent: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setConnecting(false)
    }
  }

  const handleStop = async () => {
    setConnecting(true)
    setError(null)
    try {
      await disconnectWhatsApp()
      setHasAttemptedAutoConnect(true)
      await fetchStatus({ silent: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    setConnecting(true)
    try {
      await disconnectWhatsApp()
      setHasAttemptedAutoConnect(true)
      setIsConnected(false)
      setQrCode(null)
      setGroups([])
      setRecentMessages([])
      setWatchedGroupIds([])
      setView('status')
      setSessionStatus('DISCONNECTED')
      setStatusMessage('Disconnected')
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setConnecting(false)
    }
  }

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to logout? You will need to scan the QR code again to reconnect.')) {
      return
    }
    
    setConnecting(true)
    try {
      await logoutWhatsApp()
      setIsConnected(false)
      setQrCode(null)
      setGroups([])
      setRecentMessages([])
      setWatchedGroupIds([])
      setView('status')
      setSessionStatus('DISCONNECTED')
      setStatusMessage('Logged out')
      setError(null)
      setHasAttemptedAutoConnect(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setConnecting(false)
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

  const validCount = recentMessages.filter((m) => m.isValidUpcomingEvent).length

  return (
    <>
      {/* WhatsApp Popup */}
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
            onClose()
            if (qrCode || connecting) handleStop()
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
        {/* Error Display */}
        {error && (
          <div className={`p-3 rounded-lg border text-xs ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-red-50 border-red-200 text-red-600'}`}>
            {error}
          </div>
        )}

        {/* Disconnected State */}
        {!isConnected && (
          <div className={`rounded-xl border p-4 ${cardClass}`}>
            {/* Mobile: Show "Use Desktop" message */}
            {isMobile ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="text-sm font-semibold theme-text-primary mb-2">
                  Use Desktop to Connect
                </h4>
                <p className={`text-xs ${subClass} max-w-[280px]`}>
                  WhatsApp connection requires scanning a QR code with your phone. Please use the desktop version of this app to connect WhatsApp.
                </p>
              </div>
            ) : qrCode ? (
              <div className="flex flex-col items-center py-6">
                <div className="bg-white rounded-2xl p-5 shadow-lg">
                  <QRCodeSVG value={qrCode} size={220} level="M" includeMargin={false} bgColor="#ffffff" fgColor="#000000" />
                </div>
                <p className={`text-xs mt-4 ${subClass} text-center max-w-[280px]`}>
                  Open WhatsApp → Linked Devices → Scan this code
                </p>
              </div>
            ) : connecting ? (
              <div className="flex flex-col items-center py-8">
                <LoadingSpinner size="md" label="Connecting to WhatsApp" />
                <p className={`text-xs mt-3 ${subClass}`}>Preparing QR code...</p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold">Connection status</p>
                  <p className={`text-xs mt-1 ${subClass}`}>{statusMessage}</p>
                </div>
                <button
                  onClick={handleConnect}
                  disabled={connecting || isConnected}
                  className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#25D366] hover:bg-[#20BD5A] text-white disabled:opacity-50 transition-colors"
                >
                  {connecting ? 'Connecting...' : 'Connect WhatsApp'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Connected State */}
        {isConnected && (
          <>
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

    {/* Add Groups/Contacts Popup - Rendered via Portal to ensure proper centering */}
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
