import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useDarkStore } from '../../store/useDarkStore'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { useWhatsAppBridgeStatus } from '../../hooks/useWhatsAppBridgeStatus'
import { useAuth } from '../../contexts/AuthContext'
import getSupabaseClient from '../../lib/supabase'
import LoadingSpinner from '../LoadingSpinner'
import {
  connectWhatsApp,
  disconnectWhatsApp,
  logoutWhatsApp,
  hasCredentials,
} from '../../api/whatsappClient'

const ACTIVE_PHASES = ['CONNECTING', 'AUTHENTICATING']

const PHASE_LABELS = {
  CONNECTING: 'Connecting to WhatsApp',
  AUTHENTICATING: 'Finishing setup',
  QR_READY: 'Scan to link',
}

const PHASE_HINTS = {
  CONNECTING: 'This usually takes 30–60 seconds',
  AUTHENTICATING: 'Almost ready!',
}

function statusMeta(status) {
  if (status === 'CONNECTED') return { label: 'Connected', tone: 'success' }
  if (status === 'CONNECTING') return { label: 'Connecting', tone: 'pending' }
  if (status === 'QR_READY') return { label: 'Scan QR', tone: 'pending' }
  if (status === 'AUTHENTICATING') return { label: 'Authenticating', tone: 'pending' }
  if (status === 'FAILED') return { label: 'Error', tone: 'danger' }
  return { label: 'Disconnected', tone: 'danger' }
}

export default function WhatsAppPopup({ onClose }) {
  const { isDark } = useDarkStore()
  const isMobile = useIsMobile()
  const { user } = useAuth()
  const supabase = getSupabaseClient()
  const popupRef = useRef(null)

  const live = useWhatsAppBridgeStatus()
  const isConnected = live.connected
  const phase = live.status

  const [error, setError] = useState(null)
  const [view, setView] = useState('groups')

  const [chats, setChats] = useState([])
  const [watchedIds, setWatchedIds] = useState(new Set())
  const [isLoadingChats, setIsLoadingChats] = useState(false)
  const [showAddPopup, setShowAddPopup] = useState(false)
  const [addPopupTab, setAddPopupTab] = useState('groups')
  const [isSavingGroup, setIsSavingGroup] = useState(false)
  const addPopupRef = useRef(null)

  const hasAutoConnectedRef = useRef(false)

  const meta = useMemo(() => statusMeta(phase), [phase])
  const isActive = ACTIVE_PHASES.includes(phase)

  const groups = useMemo(() => chats.filter((c) => c.is_group), [chats])
  const contacts = useMemo(() => chats.filter((c) => !c.is_group), [chats])

  // ---- Supabase: chats + watched ------------------------------------------
  const loadChats = useCallback(async () => {
    if (!supabase || !user?.id) return
    setIsLoadingChats(true)
    try {
      const [{ data: chatRows }, { data: watchedRows }] = await Promise.all([
        supabase.from('whatsapp_chats').select('*').eq('user_id', user.id),
        supabase.from('whatsapp_watched_groups').select('chat_id').eq('user_id', user.id),
      ])
      setChats(chatRows || [])
      setWatchedIds(new Set((watchedRows || []).map((r) => r.chat_id)))
    } finally {
      setIsLoadingChats(false)
    }
  }, [supabase, user?.id])

  useEffect(() => { loadChats() }, [loadChats])

  // Refresh chats when status flips to connected
  useEffect(() => {
    if (isConnected) loadChats()
  }, [isConnected, loadChats])

  // Realtime: watched changes from another tab
  useEffect(() => {
    if (!supabase || !user?.id) return
    const channel = supabase
      .channel(`watched_groups:${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'whatsapp_watched_groups', filter: `user_id=eq.${user.id}`,
      }, () => { loadChats() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, user?.id, loadChats])

  // ---- Auto-connect on open (desktop only) --------------------------------
  useEffect(() => {
    if (
      !hasAutoConnectedRef.current &&
      !isMobile &&
      hasCredentials() &&
      !isConnected &&
      phase === 'DISCONNECTED'
    ) {
      hasAutoConnectedRef.current = true
      connectWhatsApp().catch((err) => setError(err.message))
    }
  }, [isMobile, isConnected, phase])

  // ---- Click-outside close -------------------------------------------------
  useEffect(() => {
    if (showAddPopup) return
    const handle = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose, showAddPopup])

  useEffect(() => {
    if (!showAddPopup) return
    const handle = (e) => {
      if (addPopupRef.current && !addPopupRef.current.contains(e.target)) setShowAddPopup(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showAddPopup])

  // ---- Actions -------------------------------------------------------------
  const handleConnect = async () => {
    setError(null)
    try {
      await connectWhatsApp()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDisconnect = async () => {
    setError(null)
    try { await disconnectWhatsApp() } catch (err) { setError(err.message) }
  }

  const handleLogout = async () => {
    if (!confirm('Logout? You will need to scan the QR again to reconnect.')) return
    setError(null)
    try { await logoutWhatsApp() } catch (err) { setError(err.message) }
  }

  const handleAddItem = async (item) => {
    if (!supabase || !user?.id || isSavingGroup || watchedIds.has(item.chat_id)) return
    setIsSavingGroup(true)
    const next = new Set(watchedIds)
    next.add(item.chat_id)
    setWatchedIds(next)
    try {
      const { error } = await supabase.from('whatsapp_watched_groups').insert({
        user_id: user.id,
        chat_id: item.chat_id,
        name: item.name,
      })
      if (error) throw error
    } catch (err) {
      setError(err.message)
      setWatchedIds(watchedIds)
    } finally {
      setIsSavingGroup(false)
    }
  }

  const handleRemoveItem = async (chatId) => {
    if (!supabase || !user?.id || isSavingGroup) return
    setIsSavingGroup(true)
    const next = new Set(watchedIds)
    next.delete(chatId)
    setWatchedIds(next)
    try {
      const { error } = await supabase
        .from('whatsapp_watched_groups')
        .delete()
        .eq('user_id', user.id)
        .eq('chat_id', chatId)
      if (error) throw error
    } catch (err) {
      setError(err.message)
      setWatchedIds(watchedIds)
    } finally {
      setIsSavingGroup(false)
    }
  }

  // ---- Render --------------------------------------------------------------
  const panelClass = 'glass-panel text-[color:var(--theme-text-primary)]'
  const subClass = 'theme-text-secondary'
  const cardClass = 'glass-subtle border-[color:var(--theme-border)]'
  const toneClass = {
    success: 'bg-green-500',
    pending: 'bg-yellow-500 animate-pulse',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  }[meta.tone]

  return (
    <>
      <div
        ref={popupRef}
        className={`fixed inset-x-3 top-16 w-auto max-w-[420px] rounded-2xl shadow-2xl border animate-popIn z-50 overflow-hidden md:absolute md:inset-x-auto md:top-14 md:right-4 md:w-[400px] ${panelClass}`}
        style={{ maxHeight: '82vh' }}
      >
        <div className="flex items-center justify-between p-4 border-b border-[color:var(--theme-border)]">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-semibold theme-text-primary">WhatsApp</h3>
            <div className={`w-2 h-2 rounded-full ${toneClass}`} />
            <span className={`text-[11px] ${subClass}`}>{meta.label}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg theme-icon-btn">
            <svg className={`w-4 h-4 ${subClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(82vh - 80px)' }}>
          {error && (
            <div className={`p-3 rounded-lg border text-xs ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-red-50 border-red-200 text-red-600'}`}>
              {error}
            </div>
          )}

          {!isConnected && (
            <div className={`rounded-xl border p-4 ${cardClass}`}>
              {isMobile && phase === 'DISCONNECTED' ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-semibold theme-text-primary mb-2">Use Desktop to Connect</h4>
                  <p className={`text-xs ${subClass} max-w-[280px]`}>
                    QR scan requires desktop. Open this from your computer.
                  </p>
                </div>
              ) : phase === 'DISCONNECTED' || phase === 'FAILED' ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Connection status</p>
                    <p className={`text-xs mt-1 ${subClass}`}>{live.message || 'Not connected'}</p>
                  </div>
                  <button
                    onClick={handleConnect}
                    className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#25D366] hover:bg-[#20BD5A] text-white transition-colors"
                  >
                    Connect WhatsApp
                  </button>
                </div>
              ) : phase === 'QR_READY' && live.qr ? (
                <div className="flex flex-col items-center py-4">
                  <div className="bg-white rounded-2xl p-5 shadow-lg">
                    <QRCodeSVG value={live.qr} size={220} level="M" includeMargin={false} bgColor="#ffffff" fgColor="#000000" />
                  </div>
                  <p className={`text-xs mt-4 ${subClass} text-center max-w-[280px]`}>
                    Open WhatsApp → Linked Devices → Scan this code
                  </p>
                  <button
                    onClick={handleDisconnect}
                    className="text-xs text-red-400 hover:text-red-500 mt-4 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center py-6">
                  <div className="relative mb-5">
                    <div className="w-16 h-16 rounded-full bg-[#25D366]/15 flex items-center justify-center animate-whatsappPulse">
                      <svg className="w-8 h-8 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm font-semibold theme-text-primary mb-1">{PHASE_LABELS[phase] || 'Connecting'}</p>
                  <p className={`text-xs ${subClass} mb-4`}>{PHASE_HINTS[phase] || 'Setting up...'}</p>
                  <LoadingSpinner size="sm" />
                  <button
                    onClick={handleDisconnect}
                    className="text-xs text-red-400 hover:text-red-500 mt-4 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {isConnected && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium theme-text-secondary">{live.message || 'Connected'}</p>
                <div className="flex gap-2">
                  <button onClick={handleDisconnect} className="text-xs px-3 py-1.5 rounded-lg theme-control press-feedback">Disconnect</button>
                  <button onClick={handleLogout} className="text-xs px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">Logout</button>
                </div>
              </div>

              <div className={`rounded-xl border p-3 ${cardClass}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold">
                    {watchedIds.size > 0
                      ? `Watching ${watchedIds.size} item${watchedIds.size === 1 ? '' : 's'}`
                      : 'No groups or chats monitored'}
                  </p>
                  <button
                    onClick={() => setShowAddPopup(true)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20BD5A] text-white transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add
                  </button>
                </div>

                {isLoadingChats && chats.length === 0 ? (
                  <div className="flex items-center justify-center py-6"><LoadingSpinner size="sm" /></div>
                ) : watchedIds.size === 0 ? (
                  <p className={`text-xs text-center py-6 ${subClass}`}>
                    Click "Add" to select groups or contacts to monitor for events.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {chats.filter((c) => watchedIds.has(c.chat_id)).map((item) => (
                      <div key={item.chat_id} className="flex items-center gap-3 p-2 rounded-lg glass-subtle">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${item.is_group ? 'bg-[#25D366]/20' : 'bg-blue-500/20'}`}>
                          <svg className={`w-4 h-4 ${item.is_group ? 'text-[#25D366]' : 'text-blue-400'}`} fill="currentColor" viewBox="0 0 24 24">
                            <path d={item.is_group
                              ? "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-6 8c0-2.67 5.33-4 6-4s6 1.33 6 4v1H6v-1z"
                              : "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"} />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{item.name}</p>
                          <p className={`text-[10px] ${subClass}`}>
                            {item.is_group ? `${item.participant_count || 0} members` : 'Contact'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item.chat_id)}
                          disabled={isSavingGroup}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
                          title="Remove"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showAddPopup && createPortal(
        <div className="fixed inset-0 z-[60] glass-backdrop flex items-center justify-center">
          <div ref={addPopupRef} className="w-96 max-h-[80vh] rounded-2xl glass-panel glass-modal shadow-2xl flex flex-col">
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
                    addPopupTab === tab ? 'bg-[#25D366] text-white shadow-lg' : 'glass-subtle theme-text-secondary hover:theme-text-primary'
                  }`}
                >
                  {tab === 'groups' ? `Groups (${groups.length})` : `Chats (${contacts.length})`}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {isLoadingChats ? (
                <div className="flex items-center justify-center py-8"><LoadingSpinner size="sm" /></div>
              ) : (
                <div className="space-y-2">
                  {(addPopupTab === 'groups' ? groups : contacts)
                    .filter((item) => !watchedIds.has(item.chat_id))
                    .map((item) => {
                      const isGroup = addPopupTab === 'groups'
                      return (
                        <button
                          key={item.chat_id}
                          onClick={() => handleAddItem(item)}
                          disabled={isSavingGroup}
                          className="w-full flex items-center gap-3 p-3 rounded-xl glass-subtle hover:bg-white/10 transition-all text-left disabled:opacity-50 border border-transparent hover:border-[#25D366]/30"
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${isGroup ? 'bg-[#25D366]/20' : 'bg-blue-500/20'}`}>
                            <svg className={`w-5 h-5 ${isGroup ? 'text-[#25D366]' : 'text-blue-400'}`} fill="currentColor" viewBox="0 0 24 24">
                              <path d={isGroup
                                ? "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-6 8c0-2.67 5.33-4 6-4s6 1.33 6 4v1H6v-1z"
                                : "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"} />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className={`text-[11px] ${subClass} mt-0.5`}>
                              {isGroup ? `${item.participant_count || 0} members` : 'Contact'}
                            </p>
                          </div>
                          <svg className="w-5 h-5 text-[#25D366] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      )
                    })}
                  {(addPopupTab === 'groups' ? groups : contacts).filter((item) => !watchedIds.has(item.chat_id)).length === 0 && (
                    <p className={`text-sm text-center py-8 ${subClass}`}>
                      {addPopupTab === 'groups'
                        ? (groups.length === 0 ? 'No groups found' : 'All groups monitored')
                        : (contacts.length === 0 ? 'No chats found' : 'All chats monitored')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
