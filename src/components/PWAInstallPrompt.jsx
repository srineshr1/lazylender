import React, { useState, useEffect } from 'react'
import { usePWA } from '../hooks/usePWA'
import { useDarkStore } from '../store/useDarkStore'
import { Icon } from './Icons'

/**
 * PWA install prompt banner
 * Shows when the app can be installed as a PWA
 */
export default function PWAInstallPrompt() {
  const { canInstall, promptInstall, updateAvailable, applyUpdate } = usePWA()
  const { isDark } = useDarkStore()
  const [dismissed, setDismissed] = useState(false)
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)

  // Check if user has previously dismissed the prompt
  useEffect(() => {
    const dismissedTime = localStorage.getItem('pwa-install-dismissed')
    if (dismissedTime) {
      // Show again after 7 days
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      if (parseInt(dismissedTime) > weekAgo) {
        setDismissed(true)
      }
    }
  }, [])

  // Show update banner when update is available
  useEffect(() => {
    if (updateAvailable) {
      setShowUpdateBanner(true)
    }
  }, [updateAvailable])

  const handleInstall = async () => {
    const installed = await promptInstall()
    if (!installed) {
      // User declined, remember for 7 days
      handleDismiss()
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  const handleUpdate = () => {
    applyUpdate()
  }

  // Update available banner (higher priority)
  if (showUpdateBanner) {
    return (
      <div 
        className={`fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 p-4 rounded-xl shadow-lg z-50 animate-slideUp ${
          isDark ? 'bg-sidebar border border-white/10' : 'bg-white border border-gray-200'
        }`}
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Update Available
            </h3>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              A new version is ready. Refresh to update.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleUpdate}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
              >
                Refresh Now
              </button>
              <button
                onClick={() => setShowUpdateBanner(false)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Install prompt banner
  if (!canInstall || dismissed) {
    return null
  }

  return (
    <div 
      className={`fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 p-4 rounded-xl shadow-lg z-50 animate-slideUp ${
        isDark ? 'bg-sidebar border border-white/10' : 'bg-white border border-gray-200'
      }`}
      role="complementary"
      aria-label="Install app prompt"
    >
      <button
        onClick={handleDismiss}
        className={`absolute top-2 right-2 p-1 rounded-lg transition-colors ${
          isDark ? 'hover:bg-white/10 text-gray-500 hover:text-white' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
        }`}
        aria-label="Dismiss install prompt"
      >
        <Icon name="xMark" className="w-4 h-4" />
      </button>
      
      <div className="flex items-start gap-3 pr-6">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
          <Icon name="calendar" className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Install my.calendar
          </h3>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Add to home screen for a better experience
          </p>
          <button
            onClick={handleInstall}
            className="mt-3 px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
          >
            Install App
          </button>
        </div>
      </div>
    </div>
  )
}
