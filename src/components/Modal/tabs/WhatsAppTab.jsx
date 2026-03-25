import React, { useState, useEffect } from 'react'
import { useDarkStore } from '../../../store/useDarkStore'
import { useSettingsStore } from '../../../store/useSettingsStore'
import { 
  connectWhatsApp,
  disconnectWhatsApp,
  getStatus, 
  getGroups,
  getCurrentUserId 
} from '../../../api/whatsappClient'

export default function WhatsAppTab() {
  const { isDark } = useDarkStore()
  const { whatsappPollInterval, whatsappAutoAdd, savingKeys, updateSetting } = useSettingsStore()
  const [connecting, setConnecting] = useState(false)
  const [qrCode, setQrCode] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [sessionStatus, setSessionStatus] = useState('DISCONNECTED')
  const [groups, setGroups] = useState([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [error, setError] = useState(null)

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
        setIsConnected(status.connected)
        setSessionStatus(status.sessionStatus || 'DISCONNECTED')
        setQrCode(status.qr)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch WhatsApp status:', err)
        setError(err.message)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [])

  // Fetch groups when connected
  useEffect(() => {
    if (isConnected && !loadingGroups) {
      fetchGroups()
    }
  }, [isConnected])

  const fetchGroups = async () => {
    setLoadingGroups(true)
    try {
      const fetchedGroups = await getGroups()
      setGroups(fetchedGroups)
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
      setError(null)
    } catch (err) {
      console.error('Failed to disconnect WhatsApp:', err)
      setError(err.message)
    }
  }

  return (
    <div>
      {/* Error Message */}
      {error && (
        <div className={`mb-4 p-3 rounded-lg ${
          isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
        }`}>
          <p className={`text-[12px] ${isDark ? 'text-red-400' : 'text-red-600'}`}>
            {error}
          </p>
        </div>
      )}

      {/* Connection Status */}
      <div className="text-[11px] font-semibold uppercase tracking-wider mb-4 theme-text-secondary">
        Connection Status
      </div>

      <div className="p-4 rounded-xl mb-6 theme-surface-alt border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <div>
              <p className="text-[13px] font-medium theme-text-primary">
                {isConnected ? 'Connected to WhatsApp' : sessionStatus === 'CONNECTING' ? 'Connecting...' : 'Not Connected'}
              </p>
              <p className="text-[12px] mt-0.5 theme-text-secondary">
                {isConnected ? 'Ready to sync messages' : sessionStatus === 'QR_READY' ? 'Scan QR code below' : 'Click Connect to start'}
              </p>
            </div>
          </div>
          {isConnected && (
            <button
              onClick={handleDisconnect}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors press-feedback ${
                isDark 
                  ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400' 
                  : 'bg-red-50 hover:bg-red-100 text-red-600'
              }`}
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Connect Button */}
      {!isConnected && sessionStatus === 'DISCONNECTED' && (
        <div className="mb-6">
          <button
            onClick={handleConnect}
            disabled={connecting}
            className={`w-full py-3 rounded-xl text-[13px] font-medium transition-colors press-feedback ${
              connecting ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              isDark
                ? 'bg-[#25D366] hover:bg-[#20BD5A] text-white'
                : 'bg-[#25D366] hover:bg-[#20BD5A] text-white'
            }`}
          >
            {connecting ? 'Connecting...' : '📱 Connect WhatsApp'}
          </button>
        </div>
      )}

      {/* QR Code Section */}
      {!isConnected && sessionStatus === 'QR_READY' && qrCode && (
        <div className="mb-6">
          <div className="text-[11px] font-semibold uppercase tracking-wider mb-4 theme-text-secondary">
            Scan to Connect
          </div>
          <div className="p-6 rounded-xl text-center theme-surface-alt border">
            <div className="bg-white p-4 rounded-lg inline-block mb-4">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`}
                alt="WhatsApp QR Code"
                className="w-48 h-48"
              />
            </div>
            <p className="text-[12px] theme-text-secondary">
              Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
            </p>
          </div>
        </div>
      )}

      {/* Groups Section */}
      {isConnected && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider theme-text-secondary">
              WhatsApp Groups ({groups.length})
            </div>
            <button
              onClick={fetchGroups}
              disabled={loadingGroups}
              className={`text-[11px] px-3 py-1 rounded-lg press-feedback ${
                isDark 
                  ? 'bg-white/10 hover:bg-white/15 text-gray-300' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              } ${loadingGroups ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loadingGroups ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          
          <div className="rounded-xl overflow-hidden max-h-64 overflow-y-auto custom-scrollbar theme-surface-alt border">
            {groups.length === 0 ? (
              <div className={`p-6 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <p className="text-[13px]">No groups found</p>
                <p className="text-[11px] mt-1">Join WhatsApp groups to see them here</p>
              </div>
            ) : (
              groups.map((group) => (
                <div
                  key={group.id}
                  className={`flex items-center justify-between p-3 border-b last:border-b-0 ${
                    isDark ? 'border-white/[0.05]' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isDark ? 'bg-white/10' : 'bg-gray-200'
                    }`}>
                      <svg className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-[13px] font-medium theme-text-primary">
                        {group.name}
                      </p>
                      <p className="text-[11px] theme-text-secondary">
                        {group.participantCount} participant{group.participantCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="text-[11px] font-semibold uppercase tracking-wider mb-4 theme-text-secondary">
        Settings
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-[13px] font-medium theme-text-primary">
              Auto-add Events
            </p>
            <p className="text-[12px] mt-0.5 theme-text-secondary">
              Automatically create events from messages
            </p>
          </div>
          <button
            onClick={() => updateSetting('whatsappAutoAdd', !whatsappAutoAdd)}
            disabled={savingKeys.whatsappAutoAdd}
            className={`relative w-10 h-5 rounded-full transition-colors press-feedback ${
              whatsappAutoAdd 
                ? 'theme-toggle-on' 
                : 'theme-toggle'
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              whatsappAutoAdd ? 'translate-x-5' : ''
            }`} />
          </button>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-[13px] font-medium theme-text-primary">
              Poll Interval
            </p>
            <p className="text-[12px] mt-0.5 theme-text-secondary">
              How often to check for messages
            </p>
          </div>
          <select
            value={whatsappPollInterval}
            onChange={(e) => updateSetting('whatsappPollInterval', parseInt(e.target.value))}
            disabled={savingKeys.whatsappPollInterval}
            className="px-3 py-1.5 rounded-lg text-[13px] outline-none theme-control press-feedback"
          >
            <option value={10}>10 seconds</option>
            <option value={30}>30 seconds</option>
            <option value={60}>1 minute</option>
            <option value={120}>2 minutes</option>
            <option value={300}>5 minutes</option>
          </select>
        </div>
      </div>
    </div>
  )
}
