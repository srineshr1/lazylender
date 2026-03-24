import { useState, useEffect, useCallback } from 'react'

/**
 * Custom hook for responsive media queries
 * @param {string} query - Media query string (e.g., '(min-width: 768px)')
 * @returns {boolean} - Whether the media query matches
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches
    }
    return false
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handler = (event) => setMatches(event.matches)
    
    // Use addEventListener for modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handler)
      return () => mediaQuery.removeListener(handler)
    }
  }, [query])

  return matches
}

/**
 * Breakpoint constants matching Tailwind defaults
 */
export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}

/**
 * Convenience hooks for common breakpoints
 */
export function useIsMobile() {
  return !useMediaQuery(`(min-width: ${BREAKPOINTS.md})`)
}

export function useIsTablet() {
  const isAboveMobile = useMediaQuery(`(min-width: ${BREAKPOINTS.md})`)
  const isBelowDesktop = !useMediaQuery(`(min-width: ${BREAKPOINTS.lg})`)
  return isAboveMobile && isBelowDesktop
}

export function useIsDesktop() {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.lg})`)
}

export function useIsLargeDesktop() {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.xl})`)
}

/**
 * Get current breakpoint name
 * @returns {'mobile' | 'tablet' | 'desktop' | 'large'}
 */
export function useBreakpoint() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const isLargeDesktop = useIsLargeDesktop()

  if (isMobile) return 'mobile'
  if (isTablet) return 'tablet'
  if (isLargeDesktop) return 'large'
  return 'desktop'
}
