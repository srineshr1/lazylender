import { useState, useCallback, useEffect } from 'react'
import { useIsMobile, useIsTablet } from './useMediaQuery'

/**
 * Mobile layout state management hook
 * Handles sidebar/chat visibility on mobile devices
 */
export function useMobileLayout() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  
  // Track which panel is open on mobile (null = calendar view, 'sidebar', 'chat')
  const [activePanel, setActivePanel] = useState(null)
  
  // Reset panel when switching between mobile and desktop
  useEffect(() => {
    if (!isMobile && !isTablet) {
      setActivePanel(null)
    }
  }, [isMobile, isTablet])

  const openSidebar = useCallback(() => {
    setActivePanel('sidebar')
  }, [])

  const openChat = useCallback(() => {
    setActivePanel('chat')
  }, [])

  const closePanel = useCallback(() => {
    setActivePanel(null)
  }, [])

  const toggleSidebar = useCallback(() => {
    setActivePanel(prev => prev === 'sidebar' ? null : 'sidebar')
  }, [])

  const toggleChat = useCallback(() => {
    setActivePanel(prev => prev === 'chat' ? null : 'chat')
  }, [])

  // Close panel on escape key
  useEffect(() => {
    if (!activePanel) return

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closePanel()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [activePanel, closePanel])

  // Prevent body scroll when panel is open on mobile
  useEffect(() => {
    if (isMobile && activePanel) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isMobile, activePanel])

  return {
    isMobile,
    isTablet,
    isCompact: isMobile || isTablet,
    activePanel,
    isSidebarOpen: activePanel === 'sidebar',
    isChatOpen: activePanel === 'chat',
    openSidebar,
    openChat,
    closePanel,
    toggleSidebar,
    toggleChat,
  }
}
