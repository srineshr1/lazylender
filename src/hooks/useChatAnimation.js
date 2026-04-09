import { useState, useEffect, useRef } from 'react'

const ENTER_DURATION = 380
const EXIT_DURATION = 280

/**
 * Manages enter/exit animations for the floating chat panel.
 * Tracks chat phase AND FAB visibility so the FAB morphs out while
 * the chat opens, and fades back in after the chat closes.
 */
export function useChatAnimation(isOpen) {
  const [phase, setPhase] = useState('hidden') // 'hidden' | 'entering' | 'visible' | 'exiting'
  const timeoutRef = useRef(null)

  useEffect(() => {
    clearTimeout(timeoutRef.current)

    if (isOpen) {
      setPhase('entering')
      timeoutRef.current = setTimeout(() => setPhase('visible'), ENTER_DURATION)
    } else {
      if (phase === 'hidden' || phase === 'exiting') return
      setPhase('exiting')
      timeoutRef.current = setTimeout(() => setPhase('hidden'), EXIT_DURATION)
    }

    return () => clearTimeout(timeoutRef.current)
  }, [isOpen])

  // FAB is visible when chat is hidden; fades out while opening, fades in after closing
  const fabClass =
    phase === 'hidden'
      ? 'animate-fabFadeIn'
      : phase === 'entering'
        ? 'animate-fabFadeOut'
        : '' // 'visible' and 'exiting' — fab is already gone

  const chatClass =
    phase === 'entering'
      ? 'animate-chatOpen'
      : phase === 'exiting'
        ? 'animate-chatClose'
        : ''

  const isMounted = phase !== 'hidden'

  return { isMounted, phase, chatClass, fabVisible: phase === 'hidden', fabClass }
}