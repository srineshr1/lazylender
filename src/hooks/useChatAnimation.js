import { useState, useEffect, useRef } from 'react'

const ENTER_DURATION = 220
const EXIT_DURATION = 180

export function useChatAnimation(isOpen) {
  const [phase, setPhase] = useState('hidden')
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

  const fabClass =
    phase === 'hidden'
      ? 'animate-fabFadeIn'
      : phase === 'entering'
        ? 'animate-fabFadeOut'
        : ''

  const chatClass =
    phase === 'entering'
      ? 'animate-chatOpen'
      : phase === 'exiting'
        ? 'animate-chatClose'
        : ''

  const isMounted = phase !== 'hidden'

  return { isMounted, phase, chatClass, fabClass }
}
