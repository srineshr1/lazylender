import { useState, useEffect, useCallback } from 'react'

/**
 * Hook for PWA install prompt and service worker registration
 */
export function usePWA() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [swRegistration, setSwRegistration] = useState(null)

  // Check if app is already installed
  useEffect(() => {
    const checkInstalled = () => {
      // Check display-mode media query
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      // Check iOS standalone mode
      const isIOSStandalone = window.navigator.standalone === true
      setIsInstalled(isStandalone || isIOSStandalone)
    }

    checkInstalled()

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    mediaQuery.addEventListener('change', checkInstalled)
    
    return () => mediaQuery.removeEventListener('change', checkInstalled)
  }, [])

  // Capture install prompt
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      // Prevent Chrome default prompt
      e.preventDefault()
      // Store the event for later use
      setInstallPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  // Handle app installed event
  useEffect(() => {
    const handleInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener('appinstalled', handleInstalled)
    
    return () => window.removeEventListener('appinstalled', handleInstalled)
  }, [])

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Register service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      console.log('[PWA] Service workers not supported')
      return
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })
        
        setSwRegistration(registration)
        console.log('[PWA] Service Worker registered:', registration.scope)

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              setUpdateAvailable(true)
              console.log('[PWA] New version available')
            }
          })
        })

        // Check for updates periodically (every hour)
        setInterval(() => {
          registration.update()
        }, 60 * 60 * 1000)

      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error)
      }
    }

    registerSW()
  }, [])

  // Trigger install prompt
  const promptInstall = useCallback(async () => {
    if (!installPrompt) {
      console.log('[PWA] No install prompt available')
      return false
    }

    try {
      // Show the prompt
      installPrompt.prompt()
      
      // Wait for user response
      const { outcome } = await installPrompt.userChoice
      console.log('[PWA] Install prompt outcome:', outcome)
      
      // Clear the prompt (can only be used once)
      setInstallPrompt(null)
      
      return outcome === 'accepted'
    } catch (error) {
      console.error('[PWA] Install prompt error:', error)
      return false
    }
  }, [installPrompt])

  // Apply update (refresh with new service worker)
  const applyUpdate = useCallback(() => {
    if (swRegistration?.waiting) {
      // Tell the waiting service worker to activate
      swRegistration.waiting.postMessage('skipWaiting')
    }
    // Reload the page to use new service worker
    window.location.reload()
  }, [swRegistration])

  return {
    // Install
    canInstall: !!installPrompt && !isInstalled,
    isInstalled,
    promptInstall,
    
    // Network
    isOnline,
    
    // Updates
    updateAvailable,
    applyUpdate,
  }
}
