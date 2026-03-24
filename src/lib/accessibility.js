/**
 * Accessibility Utilities
 * Centralized helpers for ARIA attributes, keyboard navigation, and focus management.
 */

/**
 * Key codes for keyboard navigation
 */
export const KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
}

/**
 * Check if a key event is an activation key (Enter or Space)
 * @param {KeyboardEvent} event - Keyboard event
 * @returns {boolean}
 */
export function isActivationKey(event) {
  return event.key === KEYS.ENTER || event.key === KEYS.SPACE
}

/**
 * Check if a key event is an arrow key
 * @param {KeyboardEvent} event - Keyboard event
 * @returns {boolean}
 */
export function isArrowKey(event) {
  return [KEYS.ARROW_UP, KEYS.ARROW_DOWN, KEYS.ARROW_LEFT, KEYS.ARROW_RIGHT].includes(event.key)
}

/**
 * Handle keyboard navigation for a list of items
 * @param {KeyboardEvent} event - Keyboard event
 * @param {number} currentIndex - Current focused index
 * @param {number} itemCount - Total number of items
 * @param {Object} options - Options
 * @param {boolean} options.horizontal - Use left/right arrows instead of up/down
 * @param {boolean} options.wrap - Wrap around at ends
 * @returns {number} New index, or -1 if no change
 */
export function handleListNavigation(event, currentIndex, itemCount, options = {}) {
  const { horizontal = false, wrap = true } = options
  
  const prevKey = horizontal ? KEYS.ARROW_LEFT : KEYS.ARROW_UP
  const nextKey = horizontal ? KEYS.ARROW_RIGHT : KEYS.ARROW_DOWN
  
  let newIndex = currentIndex
  
  switch (event.key) {
    case prevKey:
      event.preventDefault()
      newIndex = currentIndex - 1
      if (newIndex < 0) {
        newIndex = wrap ? itemCount - 1 : 0
      }
      break
    case nextKey:
      event.preventDefault()
      newIndex = currentIndex + 1
      if (newIndex >= itemCount) {
        newIndex = wrap ? 0 : itemCount - 1
      }
      break
    case KEYS.HOME:
      event.preventDefault()
      newIndex = 0
      break
    case KEYS.END:
      event.preventDefault()
      newIndex = itemCount - 1
      break
    default:
      return -1
  }
  
  return newIndex
}

/**
 * Create keyboard handler for button-like elements
 * Triggers onClick for Enter and Space keys
 * @param {Function} onClick - Click handler
 * @returns {Function} Keyboard event handler
 */
export function createButtonKeyHandler(onClick) {
  return (event) => {
    if (isActivationKey(event)) {
      event.preventDefault()
      onClick(event)
    }
  }
}

/**
 * Focus trap for modals and dialogs
 * Returns cleanup function
 * @param {HTMLElement} container - Container element to trap focus within
 * @returns {Function} Cleanup function
 */
export function createFocusTrap(container) {
  if (!container) return () => {}
  
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ')
  
  const getFocusableElements = () => {
    return Array.from(container.querySelectorAll(focusableSelectors))
  }
  
  const handleKeyDown = (event) => {
    if (event.key !== KEYS.TAB) return
    
    const focusable = getFocusableElements()
    if (focusable.length === 0) return
    
    const firstElement = focusable[0]
    const lastElement = focusable[focusable.length - 1]
    
    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }
  
  container.addEventListener('keydown', handleKeyDown)
  
  // Focus first focusable element
  const focusable = getFocusableElements()
  if (focusable.length > 0) {
    focusable[0].focus()
  }
  
  return () => {
    container.removeEventListener('keydown', handleKeyDown)
  }
}

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' or 'assertive'
 */
export function announce(message, priority = 'polite') {
  const el = document.createElement('div')
  el.setAttribute('role', 'status')
  el.setAttribute('aria-live', priority)
  el.setAttribute('aria-atomic', 'true')
  el.className = 'sr-only'
  el.textContent = message
  
  document.body.appendChild(el)
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(el)
  }, 1000)
}

/**
 * Generate unique ID for ARIA relationships
 * @param {string} prefix - ID prefix
 * @returns {string} Unique ID
 */
let idCounter = 0
export function generateId(prefix = 'aria') {
  return `${prefix}-${++idCounter}`
}

/**
 * Format time for screen readers (e.g., "9:30 AM")
 * @param {string} time - Time in HH:MM format
 * @returns {string} Readable time string
 */
export function formatTimeForSR(time) {
  if (!time) return ''
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
}

/**
 * Format date for screen readers (e.g., "Monday, March 24, 2026")
 * @param {Date|string} date - Date to format
 * @returns {string} Readable date string
 */
export function formatDateForSR(date) {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format duration for screen readers (e.g., "1 hour 30 minutes")
 * @param {number} minutes - Duration in minutes
 * @returns {string} Readable duration string
 */
export function formatDurationForSR(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  const parts = []
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`)
  }
  if (mins > 0) {
    parts.push(`${mins} ${mins === 1 ? 'minute' : 'minutes'}`)
  }
  
  return parts.join(' ') || '0 minutes'
}

/**
 * Get accessible label for an event
 * @param {Object} event - Event object
 * @returns {string} Accessible label
 */
export function getEventAriaLabel(event) {
  const parts = [event.title]
  
  if (event.date) {
    parts.push(`on ${formatDateForSR(event.date)}`)
  }
  
  if (event.time) {
    parts.push(`at ${formatTimeForSR(event.time)}`)
  }
  
  if (event.duration) {
    parts.push(`for ${formatDurationForSR(event.duration)}`)
  }
  
  if (event.sub) {
    parts.push(`at ${event.sub}`)
  }
  
  if (event.done) {
    parts.push('(completed)')
  }
  
  return parts.join(' ')
}

/**
 * CSS class for visually hidden but screen reader accessible content
 */
export const SR_ONLY_CLASS = 'sr-only'

/**
 * Check if user prefers reduced motion
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Skip link component props
 * @param {string} targetId - ID of the main content
 * @returns {Object} Props for skip link
 */
export function getSkipLinkProps(targetId) {
  return {
    href: `#${targetId}`,
    className: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-lg focus:shadow-lg',
    children: 'Skip to main content',
  }
}
