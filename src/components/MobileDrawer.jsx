import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icons'
import { useDarkStore } from '../store/useDarkStore'

/**
 * Mobile drawer component for sliding panels
 * Used for sidebar and chat on mobile devices
 */
export default function MobileDrawer({ 
  isOpen, 
  onClose, 
  children, 
  side = 'left', // 'left' or 'right'
  title,
  className = ''
}) {
  const { isDark } = useDarkStore()
  const drawerRef = useRef(null)
  const previousActiveElement = useRef(null)

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement
      // Focus the drawer after animation
      setTimeout(() => {
        drawerRef.current?.focus()
      }, 100)
    } else if (previousActiveElement.current) {
      previousActiveElement.current.focus()
    }
  }, [isOpen])

  // Prevent scroll on body when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const slideClass = side === 'left' 
    ? 'left-0 animate-slideFromLeft' 
    : 'right-0 animate-slideFromRight'

  return createPortal(
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Panel'}
        tabIndex={-1}
        className={`absolute top-0 bottom-0 ${slideClass} w-[85%] max-w-sm flex flex-col ${
          isDark ? 'bg-sidebar' : 'bg-white'
        } shadow-2xl ${className}`}
      >
        {/* Header with close button */}
        {title && (
          <div className={`flex items-center justify-between px-4 py-3 border-b ${
            isDark ? 'border-white/10' : 'border-gray-200'
          }`}>
            <h2 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDark 
                  ? 'hover:bg-white/10 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
              aria-label="Close panel"
            >
              <Icon name="close" className="w-5 h-5" />
            </button>
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
