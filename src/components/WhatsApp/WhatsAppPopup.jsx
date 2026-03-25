import React, { useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useDarkStore } from '../../store/useDarkStore'
import {
  connectWhatsApp,
  disconnectWhatsApp,
  logoutWhatsApp,
  getStatus,
  getGroups,
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
  const [watchedGroupIds, setWatchedGroupIds] = useState([])
  const [recentMessages, setRecentMessages] = useState([])
  const [isSavingGroup, setIsSavingGroup] = useState(false)

  const [error, setError] = useState(null)
  const [view, setView] = useState('status')
  const [hasAttemptedAutoConnect, setHasAttemptedAutoConnect] = useState(false)

  const meta = useMemo(() => statusMeta(sessionStatus, isConnected), [sessionStatus, isConnected])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

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
      const [fetchedGroups, watched] = await Promise.all([getGroups(), getWatchedGroups()])
      setGroups(fetchedGroups)
      setWatchedGroupIds(watched.map((g) => g.id))
    } catch (err) {
      setError(err.message)
    } finally {
      if (!silent) setIsRefreshingGroups(false)
    }
  }

  const fetchMessages = async ({ silent = false } = {}) => {
    if (!silent) setIsRefreshingMessages(true)
    try {
      const messages = await getRecentMessages()
      setRecentMessages(messages.slice(0, 20))
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
        setError('Please sign in to connect WhatsApp')
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

      if (status.connected && view === 'status') {
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
    const interval = setInterval(() => {
      fetchStatus({ silent: true })
      if (isConnected) {
        fetchMessages({ silent: true })
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [isConnected])

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

  const handleGroupToggle = async (groupId) => {
    if (isSavingGroup) return
    const nextIds = watchedGroupIds.includes(groupId)
      ? watchedGroupIds.filter((id) => id !== groupId)
      : [...watchedGroupIds, groupId]

    setWatchedGroupIds(nextIds)
    setIsSavingGroup(true)
    try {
      const watchedGroups = groups.filter((g) => nextIds.includes(g.id))
      await setWatchedGroups(watchedGroups)
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

  const validCount = recentMessages.filter((m) => m.isValidUpcomingEvent).length

  return (
    <div
      ref={popupRef}
      className={`absolute top-14 right-4 w-[400px] rounded-2xl shadow-2xl border animate-popIn z-50 ${panelClass}`}
      style={{ maxHeight: '82vh' }}
    >
      <div className="flex items-center justify-between p-4 border-b border-[color:var(--theme-border)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold theme-text-primary">WhatsApp</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={`w-2 h-2 rounded-full ${toneClass}`} />
              <p className={`text-xs ${subClass}`}>{meta.label}</p>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg theme-icon-btn">
          <svg className={`w-4 h-4 ${subClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 'calc(82vh - 80px)' }}>
        <div className="p-4 space-y-4">
          {error && (
            <div className={`p-3 rounded-lg border text-xs ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-red-50 border-red-200 text-red-600'}`}>
              {error}
            </div>
          )}

            <div className={`rounded-xl border p-3 ${cardClass}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold">Connection status</p>
                <p className={`text-xs mt-1 ${subClass}`}>{statusMessage}</p>
              </div>
              {!isConnected ? (
                qrCode ? (
                  <button
                    onClick={handleStop}
                    disabled={connecting}
                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
                  >
                    {connecting ? 'Stopping...' : 'Stop'}
                  </button>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-[#25D366] hover:bg-[#20BD5A] text-white disabled:opacity-50"
                  >
                    {connecting ? 'Connecting...' : 'Scan QR code to connect'}
                  </button>
                )
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleDisconnect}
                    disabled={connecting}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold ${isDark ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'} disabled:opacity-50`}
                    title="Disconnect temporarily (can reconnect without QR)"
                  >
                    {connecting ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={connecting}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold ${isDark ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-red-50 text-red-600 hover:bg-red-100'} disabled:opacity-50`}
                    title="Logout permanently (requires QR scan to reconnect)"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>

            {!!qrCode && !isConnected && (
               <div className="mt-3 pt-3 border-t border-dashed border-[color:var(--theme-border)] text-center">
                <p className={`text-xs mb-2 ${subClass}`}>Scan QR code (attempt {qrAttempts}/{maxQrAttempts})</p>
                <div className="bg-white p-3 rounded-xl inline-block mb-2">
                  <QRCodeSVG value={qrCode} size={150} level="M" includeMargin bgColor="#ffffff" fgColor="#000000" />
                </div>
                <p className={`text-xs ${subClass}`}>Expires in {qrExpiryCountdown}s</p>
              </div>
            )}
          </div>

          {isConnected && (
            <>
               <div className="flex gap-2 p-1 rounded-lg glass-subtle">
                {['groups', 'messages', 'status'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setView(tab)}
                    className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${
                      view === tab
                        ? 'theme-control-active'
                        : 'theme-text-secondary theme-hover-text'
                    }`}
                  >
                    {tab === 'groups' ? `Groups (${watchedGroupIds.length})` : tab === 'messages' ? `Messages (${validCount})` : 'Health'}
                  </button>
                ))}
              </div>

              {view === 'groups' && (
                <div className={`rounded-xl border p-3 ${cardClass}`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold">Watched groups</p>
                    <button
                      onClick={() => fetchGroups()}
                      disabled={isRefreshingGroups}
                      className="text-xs px-3 py-1.5 rounded-lg theme-control press-feedback disabled:opacity-50"
                    >
                      {isRefreshingGroups ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>

                  {isLoadingInitial ? (
                    <div className={`text-xs ${subClass}`}>Loading groups...</div>
                  ) : groups.length === 0 ? (
                    <div className={`text-xs ${subClass}`}>No groups found yet.</div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {groups.map((group) => (
                        <label key={group.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10">
                          <input
                            type="checkbox"
                            checked={watchedGroupIds.includes(group.id)}
                            onChange={() => handleGroupToggle(group.id)}
                            disabled={isSavingGroup}
                            className="w-4 h-4 rounded accent-[#25D366]"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">{group.name}</p>
                            <p className={`text-xs ${subClass}`}>{group.participantCount} members · {group.messageCount || 0} msgs</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

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
                    <div className={`text-xs ${subClass}`}>No recent messages captured yet.</div>
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
                          <p className={`text-xs ${subClass}`} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{message.text || 'Media message'}</p>
                          <p className={`text-[10px] mt-1 ${subClass}`}>{formatTime(message.timestamp)} · {message.messageType}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {view === 'status' && (
                <div className={`rounded-xl border p-3 ${cardClass}`}>
                  <p className="text-xs font-semibold mb-2">Connection health</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                     <div className="rounded-lg p-2 glass-subtle">
                      <p className={subClass}>Session</p>
                      <p className="font-semibold mt-1">{sessionStatus}</p>
                    </div>
                     <div className="rounded-lg p-2 glass-subtle">
                      <p className={subClass}>Watched groups</p>
                      <p className="font-semibold mt-1">{watchedGroupIds.length}</p>
                    </div>
                     <div className="rounded-lg p-2 glass-subtle">
                      <p className={subClass}>Recent valid events</p>
                      <p className="font-semibold mt-1">{validCount}</p>
                    </div>
                     <div className="rounded-lg p-2 glass-subtle">
                      <p className={subClass}>Latest status</p>
                      <p className="font-semibold mt-1 truncate">{statusMessage}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!isConnected && !qrCode && !isLoadingInitial && (
            <div className={`rounded-xl border p-4 text-center ${cardClass}`}>
              <p className="text-sm font-semibold mb-1">Connect your WhatsApp</p>
              <p className={`text-xs ${subClass}`}>We will monitor watched groups and extract upcoming events from text, images, and PDFs.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
