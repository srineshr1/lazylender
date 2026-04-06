import React, { useState, useRef, useEffect } from 'react'
import { Icon } from '../Icons'
import { useEventStore } from '../../store/useEventStore'
import { useDarkStore } from '../../store/useDarkStore'
import { useWhatsAppSettings } from '../../store/useWhatsAppSettings'
import { useWhatsAppBridgeStatus } from '../../hooks/useWhatsAppBridgeStatus'
import { useNotificationStore } from '../../store/useNotificationStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { KEYS, handleListNavigation } from '../../lib/accessibility'
import NotificationPanel from '../Notifications/NotificationPanel'
import WhatsAppPopup from '../WhatsApp/WhatsAppPopup'

const VIEWS = ['Day', 'Week', 'Month']

export default function TopBar({ 
  activeView, 
  setActiveView, 
  onAddEvent, 
  onWhatsAppSettings, 
  onSettings,
  onMenuClick,
  onChatClick,
  isMobile = false
}) {
  const { searchQuery, setSearchQuery } = useEventStore()
  const { isDark, toggle } = useDarkStore()
  const { enabled } = useWhatsAppSettings()
  const { connected } = useWhatsAppBridgeStatus()
  const { isOpen, togglePanel, unreadCount } = useNotificationStore()
  const { user, authEnabled, signOut } = useAuth()
  const { dragDropEnabled, updateSetting } = useSettingsStore()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [whatsappOpen, setWhatsappOpen] = useState(false)
  const userMenuRef = useRef(null)
  const userButtonRef = useRef(null)

  // Close user menu when clicking outside
  useEffect(() => {
    if (!showUserMenu) return
    
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target) &&
          userButtonRef.current && !userButtonRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
    }
    
    const handleEscape = (e) => {
      if (e.key === KEYS.ESCAPE) {
        setShowUserMenu(false)
        userButtonRef.current?.focus()
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showUserMenu])

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  // Handle keyboard navigation for view tabs
  const handleViewKeyDown = (e, currentIndex) => {
    const newIndex = handleListNavigation(e, currentIndex, VIEWS.length, { horizontal: true, wrap: true })
    if (newIndex >= 0 && newIndex !== currentIndex) {
      setActiveView(VIEWS[newIndex])
    }
  }

  return (
    <header 
      className="relative z-40 border-b border-[color:var(--theme-border)] px-3 md:px-6 h-14 flex items-center gap-2 md:gap-4 flex-shrink-0 glass-subtle"
      role="banner"
    >
      {/* Mobile menu button */}
      {isMobile && onMenuClick && (
        <button
          onClick={onMenuClick}
          className="w-10 h-10 rounded-lg theme-icon-btn flex items-center justify-center md:hidden"
          aria-label="Open menu"
        >
          <Icon name="menu" className="w-5 h-5" aria-hidden="true" />
        </button>
      )}

      {/* Search - hidden on mobile, shown on tablet+ */}
      <div className="hidden sm:flex items-center gap-2 rounded-lg px-3 py-1.5 border w-40 md:w-56" style={{ 
        backgroundColor: 'color-mix(in srgb, var(--theme-panel) 88%, var(--color-accent) 12%)',
        borderColor: 'color-mix(in srgb, var(--theme-border) 75%, var(--color-accent) 25%)'
      }}>
        <Icon name="search" className="w-3.5 h-3.5 theme-text-secondary flex-shrink-0" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search events…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none outline-none text-[13px] theme-text-primary placeholder:text-[color:var(--theme-text-secondary)] w-full font-sans"
          aria-label="Search events"
        />
      </div>

      {/* Spacer - use min-width for stable positioning */}
      <div className="flex-1 min-w-2 sm:min-w-4" />

      {/* View tabs — Day / Week / Month */}
      <nav aria-label="Calendar view">
        <div className="flex gap-0.5 rounded-lg p-0.5 glass-subtle" role="tablist">
          {VIEWS.map((v, index) => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              onKeyDown={(e) => handleViewKeyDown(e, index)}
              className={`
                px-2 sm:px-3.5 py-1.5 rounded-md text-[11px] sm:text-[12.5px] font-medium transition-all duration-150
                ${activeView === v
                  ? 'theme-control-active shadow-sm'
                  : 'theme-text-secondary theme-hover-text hover:bg-black/5'}
              `}
              role="tab"
              aria-selected={activeView === v}
              aria-controls={`${v.toLowerCase()}-view-panel`}
              tabIndex={activeView === v ? 0 : -1}
            >
              {v}
            </button>
          ))}
        </div>
      </nav>

      {/* Spacer - use min-width for stable positioning */}
      <div className="flex-1 min-w-2 sm:min-w-4" />

      <div className="flex gap-1" role="toolbar" aria-label="Calendar actions">
        {/* Drag & Drop toggle - only show in Day and Week views, hidden on mobile */}
        {(activeView === 'Day' || activeView === 'Week') && (
          <button
            onClick={() => updateSetting('dragDropEnabled', !dragDropEnabled)}
            className={`hidden sm:flex px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[11.5px] font-medium transition-all duration-150 whitespace-nowrap ${
              dragDropEnabled
                ? 'text-white shadow-sm'
                : 'theme-text-secondary hover:bg-black/5 theme-hover-text'
            }`}
            style={dragDropEnabled ? { backgroundColor: 'var(--color-accent)' } : {}}
            aria-label={`Drag and drop is ${dragDropEnabled ? 'enabled' : 'disabled'}. Click to ${dragDropEnabled ? 'disable' : 'enable'}.`}
            aria-pressed={dragDropEnabled}
          >
            Drag & Drop: {dragDropEnabled ? 'On' : 'Off'}
          </button>
        )}
        {/* WhatsApp - hidden on mobile (show "use desktop" message in popup instead) */}
        <div className="relative hidden sm:block">
          <button
            onClick={() => setWhatsappOpen(!whatsappOpen)}
            className="relative w-8 h-8 rounded-lg theme-icon-btn flex items-center justify-center"
            aria-label={connected ? 'WhatsApp Connected' : enabled ? 'WhatsApp Disconnected' : 'WhatsApp settings'}
            aria-expanded={whatsappOpen}
            aria-haspopup="dialog"
          >
            <svg className={`w-4 h-4 ${connected ? 'text-[#25D366]' : ''}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {enabled && (
              <span 
                className={`absolute top-1 right-1 w-2 h-2 rounded-full ${connected ? 'bg-[#25D366]' : 'bg-red-500'}`} 
                aria-hidden="true"
              />
            )}
          </button>
          {whatsappOpen && <WhatsAppPopup onClose={() => setWhatsappOpen(false)} />}
        </div>
        <button
          onClick={() => toggle()}
          className="w-8 h-8 rounded-lg theme-icon-btn flex items-center justify-center"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-pressed={isDark}
        >
          <Icon name={isDark ? 'sun' : 'moon'} className="w-4 h-4" aria-hidden="true" />
        </button>
        {/* Add event button - always visible */}
        <button
          onClick={onAddEvent}
          className="w-8 h-8 rounded-lg theme-icon-btn flex items-center justify-center"
          aria-label="Add new event"
        >
          <Icon name="plus" className="w-4 h-4" aria-hidden="true" />
        </button>
        
        {/* User menu - only show if authenticated, hidden on mobile */}
        {authEnabled && user && (
          <div className="relative hidden sm:block">
            <button 
              ref={userButtonRef}
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-8 h-8 rounded-lg theme-icon-btn flex items-center justify-center" 
              aria-label={`User menu for ${user.email}`}
              aria-expanded={showUserMenu}
              aria-haspopup="menu"
            >
              <Icon name="user" className="w-4 h-4" aria-hidden="true" />
            </button>
            {showUserMenu && (
              <div 
                ref={userMenuRef}
                className="absolute right-0 mt-2 w-64 rounded-lg shadow-lg z-50 glass-panel" 
                role="menu"
                aria-label="User menu"
              >
                <div className="p-3 border-b" style={{ borderColor: 'var(--theme-border)' }}>
                  <p className="text-xs theme-text-secondary">Signed in as</p>
                  <p className="text-sm font-medium theme-text-primary truncate">{user.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 text-red-600 dark:text-red-400 flex items-center gap-2"
                  role="menuitem"
                >
                  <Icon name="logout" className="w-4 h-4" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* If not authenticated, just show plain user icon - hidden on mobile */}
        {(!authEnabled || !user) && (
          <button 
            className="hidden sm:flex w-8 h-8 rounded-lg theme-icon-btn items-center justify-center" 
            aria-label="Profile (not signed in)"
          >
            <Icon name="user" className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
        
        <div className="relative">
          <button
            data-notification-trigger
            onClick={togglePanel}
            className="relative w-8 h-8 rounded-lg theme-icon-btn flex items-center justify-center"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            aria-expanded={isOpen}
            aria-haspopup="dialog"
          >
            <Icon name="bell" className="w-4 h-4" aria-hidden="true" />
            {unreadCount > 0 && (
              <div 
                className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-medium"
                aria-hidden="true"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </button>
          {isOpen && <NotificationPanel />}
        </div>
        <button
          onClick={onSettings}
          className="w-8 h-8 rounded-lg theme-icon-btn flex items-center justify-center"
          aria-label="Settings"
        >
          <Icon name="cog" className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
