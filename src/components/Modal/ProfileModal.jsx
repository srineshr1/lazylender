import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useWhatsAppSettings } from '../../store/useWhatsAppSettings'
import { useWhatsAppBridgeStatus } from '../../hooks/useWhatsAppBridgeStatus'
import getSupabaseClient from '../../lib/supabase'
import { createFocusTrap, KEYS } from '../../lib/accessibility'

const TABS = [
  { id: 'account', label: 'Account' },
  { id: 'integrations', label: 'Integrations' },
]

function getInitials(name, email) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/)
    return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2)
  }
  if (email) {
    return email[0].toUpperCase()
  }
  return '?'
}

export default function ProfileModal({ isOpen, onClose, onOpenWhatsAppSettings }) {
  const { user, session, signOut, updatePassword } = useAuth()
  const { initializeSettings } = useSettingsStore()
  const whatsappSettings = useWhatsAppSettings()
  const { connected } = useWhatsAppBridgeStatus()
  const [activeTab, setActiveTab] = useState('account')
  const [displayName, setDisplayName] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const modalRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (isOpen && user) {
      setDisplayName(user.user_metadata?.full_name || user.user_metadata?.name || '')
      setNameSaved(false)
      setShowPasswordForm(false)
      setNewPassword('')
      setConfirmPassword('')
      setPasswordError('')
      setPasswordSuccess(false)
      setActiveTab('account')
    }
  }, [isOpen, user])

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement
      const cleanup = createFocusTrap(modalRef.current)
      return () => {
        cleanup()
        previousFocusRef.current?.focus()
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === KEYS.ESCAPE) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !user) return null

  const avatarUrl = user.user_metadata?.avatar_url
  const initials = getInitials(displayName, user.email)
  const emailVerified = !!session?.user?.email_confirmed_at

  const handleSaveName = async () => {
    if (!displayName.trim()) return
    setIsSavingName(true)
    setNameSaved(false)
    try {
      const supabase = getSupabaseClient()
      if (supabase) {
        await supabase
          .from('profiles')
          .update({ full_name: displayName.trim() })
          .eq('id', user.id)
        await supabase.auth.updateUser({ data: { full_name: displayName.trim() } })
        if (initializeSettings) {
          const settings = useSettingsStore.getState()
          if (settings.supabase && settings.userId) {
            await settings.initializeSettings(settings.supabase, settings.userId)
          }
        }
      }
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 2000)
    } catch (err) {
      console.error('[ProfileModal] Failed to save name:', err)
    } finally {
      setIsSavingName(false)
    }
  }

  const handleChangePassword = async () => {
    setPasswordError('')
    setPasswordSuccess(false)

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    setIsUpdatingPassword(true)
    try {
      await updatePassword(newPassword)
      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        setPasswordSuccess(false)
        setShowPasswordForm(false)
      }, 2000)
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      onClose()
    } catch (err) {
      console.error('[ProfileModal] Sign out error:', err)
    } finally {
      setIsSigningOut(false)
    }
  }

  const handleOpenWhatsAppSettings = () => {
    onClose()
    if (onOpenWhatsAppSettings) {
      setTimeout(() => onOpenWhatsAppSettings(), 100)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 glass-backdrop z-40"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          ref={modalRef}
          className="w-full sm:w-[480px] max-h-[calc(100vh-80px)] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-modalIn glass-panel glass-modal"
        >
          <div className="px-6 py-5 border-b border-[color:var(--theme-border)]/80 flex items-center justify-between">
            <h2 className="text-[18px] font-semibold tracking-tight theme-text-primary">
              Profile
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
            {activeTab === 'account' && (
              <AccountTab
                avatarUrl={avatarUrl}
                initials={initials}
                displayName={displayName}
                setDisplayName={setDisplayName}
                isSavingName={isSavingName}
                nameSaved={nameSaved}
                onSaveName={handleSaveName}
                email={user.email}
                emailVerified={emailVerified}
                showPasswordForm={showPasswordForm}
                setShowPasswordForm={setShowPasswordForm}
                newPassword={newPassword}
                setNewPassword={setNewPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                isUpdatingPassword={isUpdatingPassword}
                passwordError={passwordError}
                passwordSuccess={passwordSuccess}
                onChangePassword={handleChangePassword}
                onSignOut={handleSignOut}
                isSigningOut={isSigningOut}
              />
            )}
            {activeTab === 'integrations' && (
              <IntegrationsTab
                whatsappConnected={connected}
                whatsappEnabled={whatsappSettings.enabled}
                onOpenWhatsAppSettings={handleOpenWhatsAppSettings}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function AccountTab({
  avatarUrl, initials, displayName, setDisplayName, isSavingName, nameSaved,
  onSaveName, email, emailVerified, showPasswordForm, setShowPasswordForm,
  newPassword, setNewPassword, confirmPassword, setConfirmPassword,
  isUpdatingPassword, passwordError, passwordSuccess, onChangePassword,
  onSignOut, isSigningOut
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="w-16 h-16 rounded-full object-cover border-2 border-[color:var(--theme-border)]"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-accent/15 border-2 border-accent/30 flex items-center justify-center text-accent font-semibold text-[20px]">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
            Display Name
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSaveName() }}
              className="flex-1 px-2.5 py-1.5 rounded-lg text-[13px] glass-field outline-none"
              placeholder="Your name"
              aria-label="Display name"
            />
            <button
              onClick={onSaveName}
              disabled={isSavingName || !displayName.trim()}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
              style={{
                background: nameSaved
                  ? 'color-mix(in srgb, #22c55e 20%, var(--theme-panel) 80%)'
                  : 'color-mix(in srgb, var(--color-accent) 18%, var(--theme-panel) 82%)',
                color: nameSaved ? '#22c55e' : 'var(--color-accent)',
                border: `1px solid ${nameSaved
                  ? 'color-mix(in srgb, #22c55e 30%, var(--theme-border) 70%)'
                  : 'color-mix(in srgb, var(--color-accent) 30%, var(--theme-border) 70%)'}`,
              }}
            >
              {nameSaved ? 'Saved' : isSavingName ? '…' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div className="h-px bg-[color:var(--theme-border)]/50" role="separator" />

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider mb-3 theme-text-secondary">
          Email
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] theme-text-primary">{email}</span>
          {emailVerified && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
              Verified
            </span>
          )}
        </div>
        <p className="text-[11px] mt-1 theme-text-secondary">Email cannot be changed here</p>
      </div>

      <div className="h-px bg-[color:var(--theme-border)]/50" role="separator" />

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider mb-3 theme-text-secondary">
          Password
        </div>
        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="px-4 py-2 rounded-lg text-[12.5px] font-medium transition-colors"
            style={{
              background: 'color-mix(in srgb, var(--theme-panel) 90%, var(--color-accent) 10%)',
              border: '1px solid color-mix(in srgb, var(--theme-border) 84%, var(--color-accent) 16%)',
              color: 'var(--theme-text-primary)',
            }}
          >
            Change password
          </button>
        ) : (
          <div className="space-y-3">
            {passwordSuccess && (
              <div className="text-[12px] text-green-600 dark:text-green-400 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Password updated successfully
              </div>
            )}
            {passwordError && (
              <div className="text-[12px] text-red-500 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {passwordError}
              </div>
            )}
            <input
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPasswordError('') }}
              className="w-full px-3 py-2 rounded-lg text-[13px] glass-field outline-none"
              placeholder="New password (min 6 characters)"
              aria-label="New password"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') onChangePassword() }}
              className="w-full px-3 py-2 rounded-lg text-[13px] glass-field outline-none"
              placeholder="Confirm new password"
              aria-label="Confirm new password"
            />
            <div className="flex gap-2">
              <button
                onClick={onChangePassword}
                disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                className="px-4 py-2 rounded-lg text-[12.5px] font-medium transition-colors disabled:opacity-50"
                style={{
                  background: 'var(--color-accent)',
                  color: 'white',
                }}
              >
                {isUpdatingPassword ? 'Updating…' : 'Update password'}
              </button>
              <button
                onClick={() => {
                  setShowPasswordForm(false)
                  setNewPassword('')
                  setConfirmPassword('')
                  setPasswordError('')
                }}
                className="px-4 py-2 rounded-lg text-[12.5px] font-medium theme-text-secondary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-[color:var(--theme-border)]/50" role="separator" />

      <button
        onClick={onSignOut}
        disabled={isSigningOut}
        className="w-full px-4 py-2.5 rounded-lg text-[13px] font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        style={{
          background: 'color-mix(in srgb, #ef4444 10%, var(--theme-panel) 90%)',
          border: '1px solid color-mix(in srgb, #ef4444 25%, var(--theme-border) 75%)',
          color: '#ef4444',
        }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9A.75.75 0 0115 9V5.25a1.5 1.5 0 00-1.5-1.5h-6zm10.72 4.72a.75.75 0 011.06 0l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 11-1.06-1.06l1.72-1.72H9a.75.75 0 010-1.5h10.94l-1.72-1.72a.75.75 0 010-1.06z" />
        </svg>
        {isSigningOut ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  )
}

function IntegrationsTab({ whatsappConnected, whatsappEnabled, onOpenWhatsAppSettings }) {
  return (
    <div className="space-y-5">
      <div className="text-[11px] font-semibold uppercase tracking-wider mb-1 theme-text-secondary">
        Connected Services
      </div>

      <div className="flex items-center justify-between py-3 px-4 rounded-xl glass-subtle">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, #25D366 15%, var(--theme-panel) 85%)' }}>
            <svg className="w-5 h-5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-medium theme-text-primary">WhatsApp</p>
            <p className="text-[11px] theme-text-secondary">
              {whatsappConnected
                ? 'Connected and syncing events'
                : whatsappEnabled
                  ? 'Enabled — not connected'
                  : 'Disabled'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${whatsappConnected ? 'bg-[#25D366]' : whatsappEnabled ? 'bg-amber-400' : 'bg-gray-400'}`} />
          <span className="text-[11px] theme-text-secondary">
            {whatsappConnected ? 'Online' : whatsappEnabled ? 'Offline' : 'Off'}
          </span>
        </div>
      </div>

      <button
        onClick={onOpenWhatsAppSettings}
        className="w-full px-4 py-2.5 rounded-lg text-[12.5px] font-medium transition-colors flex items-center justify-center gap-1.5"
        style={{
          background: 'color-mix(in srgb, var(--theme-panel) 90%, var(--color-accent) 10%)',
          border: '1px solid color-mix(in srgb, var(--theme-border) 84%, var(--color-accent) 16%)',
          color: 'var(--theme-text-primary)',
        }}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.204-.107-.397.165-.71.505-.78.93l-.15.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.02-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.449l.527-.738c.25-.35.273-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.11v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.449l.773-.774a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.93l.15-.894z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Open WhatsApp Settings
      </button>
    </div>
  )
}