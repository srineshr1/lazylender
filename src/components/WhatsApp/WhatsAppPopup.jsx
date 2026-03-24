import React, { useState, useEffect, useRef } from 'react'
import { useDarkStore } from '../../store/useDarkStore'
import { QRCodeSVG } from 'qrcode.react'
import { 
  connectWhatsApp,
  disconnectWhatsApp,
  getStatus, 
  getGroups,
  getWatchedGroups,
  setWatchedGroups,
  getCurrentUserId 
} from '../../api/whatsappClient'

export default function WhatsAppPopup({ onClose }) {
  const { isDark } = useDarkStore()
  const popupRef = useRef(null)
  
  const [connecting, setConnecting] = useState(false)
  const [qrCode, setQrCode] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [sessionStatus, setSessionStatus] = useState('DISCONNECTED')
  const [groups, setGroups] = useState([])
  const [watchedGroupIds, setWatchedGroupIds] = useState([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [error, setError] = useState(null)
  const [view, setView] = useState('status') // 'status', 'groups'
  const [qrExpiryCountdown, setQrExpiryCountdown] = useState(0)
  const [qrAttempts, setQrAttempts] = useState(0)
  const [maxQrAttempts, setMaxQrAttempts] = useState(3)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose()
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Auto-connect on first load if not connected but has credentials
  const [hasAttemptedAutoConnect, setHasAttemptedAutoConnect] = useState(false)
  
  useEffect(() => {
    const autoConnect = async () => {
      if (hasAttemptedAutoConnect) return
      
      const userId = getCurrentUserId()
      if (!userId) return
      
      try {
        const status = await getStatus()
        // If not connected and no active session, auto-trigger connect
        // This will restore the session using stored Baileys auth (no QR needed)
        if (!status.connected && !status.sessionActive && status.sessionStatus === 'DISCONNECTED') {
          console.log('[WhatsApp] Auto-connecting with stored credentials...')
          setHasAttemptedAutoConnect(true)
          await connectWhatsApp()
        }
      } catch (err) {
        console.log('[WhatsApp] Auto-connect check failed:', err.message)
      }
    }
    
    autoConnect()
  }, [hasAttemptedAutoConnect])

  // Fetch status and QR code
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const userId = getCurrentUserId()
        if (!userId) {
          setError('Please sign in to connect WhatsApp')
          return
        }

        const status = await getStatus()
        console.log('WhatsApp status update:', status)
        
        // Update attempt counters
        setQrAttempts(status.qrAttempts || 0)
        setMaxQrAttempts(status.maxQrAttempts || 3)
        
        // Handle QR code expiry countdown
        if (status.qr && !qrCode) {
          // New QR code received - start 45 second countdown
          setQrExpiryCountdown(45)
        } else if (status.qr && qrCode) {
          // QR still valid - decrement countdown
          setQrExpiryCountdown(prev => Math.max(0, prev - 5))
        } else if (!status.qr && qrCode) {
          // QR expired
          setQrCode(null)
          setQrExpiryCountdown(0)
        }
        
        setIsConnected(status.connected)
        setSessionStatus(status.sessionStatus || 'DISCONNECTED')
        setQrCode(status.qr)
        
        // Handle QR expiry
        if (status.sessionStatus === 'QR_EXPIRED') {
          setError(`QR code expired after ${maxQrAttempts} attempts. Click "Connect WhatsApp" to try again.`)
          setQrCode(null)
        } else {
          setError(null)
        }

        // If connected and viewing status, switch to groups view
        if (status.connected && view === 'status') {
          setView('groups')
          fetchGroups()
        }
      } catch (err) {
        console.error('Failed to fetch WhatsApp status:', err)
        setError(err.message)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [view, qrCode])

  // Fetch groups when connected
  const fetchGroups = async () => {
    setLoadingGroups(true)
    try {
      const [fetchedGroups, watched] = await Promise.all([
        getGroups(),
        getWatchedGroups()
      ])
      setGroups(fetchedGroups)
      setWatchedGroupIds(watched.map(g => g.id))
      setError(null)
    } catch (err) {
      console.error('Failed to fetch groups:', err)
      setError(err.message)
    } finally {
      setLoadingGroups(false)
    }
  }

  const handleConnect = async () => {
    setConnecting(true)
    setError(null)
    setQrCode(null)
    setQrExpiryCountdown(0)
    setQrAttempts(0)
    try {
      const userId = getCurrentUserId()
      if (!userId) {
        throw new Error('Please sign in to connect WhatsApp')
      }
      
      await connectWhatsApp()
      // Status will be updated by the polling effect
    } catch (err) {
      console.error('Failed to connect WhatsApp:', err)
      setError(err.message)
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnectWhatsApp()
      setIsConnected(false)
      setQrCode(null)
      setGroups([])
      setWatchedGroupIds([])
      setView('status')
      setError(null)
    } catch (err) {
      console.error('Failed to disconnect WhatsApp:', err)
      setError(err.message)
    }
  }

  const handleGroupToggle = async (groupId) => {
    const newWatchedIds = watchedGroupIds.includes(groupId)
      ? watchedGroupIds.filter(id => id !== groupId)
      : [...watchedGroupIds, groupId]
    
    setWatchedGroupIds(newWatchedIds)
    
    try {
      const watchedGroups = groups.filter(g => newWatchedIds.includes(g.id))
      await setWatchedGroups(watchedGroups)
    } catch (err) {
      console.error('Failed to update watched groups:', err)
      setError(err.message)
    }
  }

  return (
    <div
      ref={popupRef}
      className={`absolute top-14 right-4 w-[380px] rounded-2xl shadow-2xl border animate-popIn z-50 ${
        isDark 
          ? 'bg-[#1f1d30] border-white/10' 
          : 'bg-white border-gray-200'
      }`}
      style={{ maxHeight: '80vh' }}
    >
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${
        isDark ? 'border-white/10' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div>
            <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
              WhatsApp
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {isConnected ? 'Connected' : sessionStatus === 'CONNECTING' ? 'Connecting...' : 'Not Connected'}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className={`p-1.5 rounded-lg transition-colors ${
            isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
          }`}
        >
          <svg className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 80px)' }}>
        <div className="p-4">
          {/* Error Message */}
          {error && (
            <div className={`mb-4 p-3 rounded-lg ${
              isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`text-xs ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                {error}
              </p>
            </div>
          )}

          {/* View Toggle */}
          {isConnected && (
            <div className={`flex gap-2 mb-4 p-1 rounded-lg ${
              isDark ? 'bg-white/5' : 'bg-gray-100'
            }`}>
              <button
                onClick={() => setView('status')}
                className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${
                  view === 'status'
                    ? isDark 
                      ? 'bg-white/10 text-gray-200' 
                      : 'bg-white text-gray-700 shadow-sm'
                    : isDark
                      ? 'text-gray-400 hover:text-gray-300'
                      : 'text-gray-600 hover:text-gray-700'
                }`}
              >
                Connection
              </button>
              <button
                onClick={() => {
                  setView('groups')
                  fetchGroups()
                }}
                className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${
                  view === 'groups'
                    ? isDark 
                      ? 'bg-white/10 text-gray-200' 
                      : 'bg-white text-gray-700 shadow-sm'
                    : isDark
                      ? 'text-gray-400 hover:text-gray-300'
                      : 'text-gray-600 hover:text-gray-700'
                }`}
              >
                Groups ({watchedGroupIds.length})
              </button>
            </div>
          )}

          {/* Status View */}
          {view === 'status' && (
            <>
              {!isConnected && sessionStatus === 'DISCONNECTED' && (
                <div className="text-center py-8">
                  <div className={`text-4xl mb-4`}>📱</div>
                  <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                    Connect Your WhatsApp
                  </h4>
                  <p className={`text-xs mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Sync calendar events from your WhatsApp groups
                  </p>
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${
                      connecting ? 'opacity-50 cursor-not-allowed' : ''
                    } bg-[#25D366] hover:bg-[#20BD5A] text-white`}
                  >
                    {connecting ? 'Connecting...' : 'Connect WhatsApp'}
                  </button>
                </div>
              )}

              {!isConnected && qrCode && (
                <div className="text-center py-4">
                  <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                    Scan QR Code
                  </h4>
                  <p className={`text-xs mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Attempt <span className="font-bold text-[#25D366]">{qrAttempts}/{maxQrAttempts}</span>
                  </p>
                  <div className="bg-white p-3 rounded-xl inline-block mb-4">
                    <QRCodeSVG 
                      value={qrCode}
                      size={160}
                      level="M"
                      includeMargin={true}
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  </div>
                  {qrExpiryCountdown > 0 && (
                    <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Expires in: <span className="font-mono font-bold text-[#25D366]">{qrExpiryCountdown}s</span>
                    </p>
                  )}
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Open WhatsApp → Settings → Linked Devices → Link a Device
                  </p>
                  {qrAttempts < maxQrAttempts && (
                    <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      New QR will generate automatically if this expires
                    </p>
                  )}
                </div>
              )}

              {!isConnected && sessionStatus === 'QR_EXPIRED' && (
                <div className="text-center py-8">
                  <div className={`text-4xl mb-4`}>⏰</div>
                  <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                    QR Code Expired
                  </h4>
                  <p className={`text-xs mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    You didn't scan the QR code in time. Click below to try again.
                  </p>
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${
                      connecting ? 'opacity-50 cursor-not-allowed' : ''
                    } bg-[#25D366] hover:bg-[#20BD5A] text-white`}
                  >
                    {connecting ? 'Connecting...' : 'Try Again'}
                  </button>
                </div>
              )}

              {isConnected && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">✅</div>
                  <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                    WhatsApp Connected
                  </h4>
                  <p className={`text-xs mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Ready to sync messages from groups
                  </p>
                  <button
                    onClick={() => {
                      setView('groups')
                      fetchGroups()
                    }}
                    className={`w-full py-2.5 rounded-lg text-sm font-medium mb-2 ${
                      isDark
                        ? 'bg-white/10 hover:bg-white/15 text-gray-200'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    Manage Groups
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className={`w-full py-2.5 rounded-lg text-sm font-medium ${
                      isDark
                        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                        : 'bg-red-50 hover:bg-red-100 text-red-600'
                    }`}
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </>
          )}

          {/* Groups View */}
          {view === 'groups' && isConnected && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h4 className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                  Select Groups to Watch
                </h4>
                <button
                  onClick={fetchGroups}
                  disabled={loadingGroups}
                  className={`text-xs px-3 py-1.5 rounded-lg ${
                    isDark 
                      ? 'bg-white/10 hover:bg-white/15 text-gray-300' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  } ${loadingGroups ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loadingGroups ? '...' : 'Refresh'}
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {groups.length === 0 ? (
                  <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <p className="text-xs">No groups found</p>
                    <p className="text-xs mt-1">Join WhatsApp groups to see them here</p>
                  </div>
                ) : (
                  groups.map((group) => (
                    <label
                      key={group.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        isDark 
                          ? 'hover:bg-white/5' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={watchedGroupIds.includes(group.id)}
                        onChange={() => handleGroupToggle(group.id)}
                        className="w-4 h-4 rounded accent-[#25D366]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                          {group.name}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {group.participantCount} members
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
