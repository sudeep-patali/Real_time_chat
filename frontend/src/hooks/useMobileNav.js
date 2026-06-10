/**
 * useMobileNav
 *
 * Detects whether the current viewport is "mobile" (≤768 px) and provides a
 * stable boolean that updates on resize.  Used by FindPeople and CreateGroup
 * to decide whether to render as a full-screen page (mobile) or the existing
 * desktop layout (sidebar + content panel).
 */
import { useState, useEffect } from 'react'

const MOBILE_BREAKPOINT = 768

export function useMobileNav() {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches
  )

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)

    const handler = (e) => setIsMobile(e.matches)

    // Modern browsers
    if (mq.addEventListener) {
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }

    // Legacy Safari ≤ 13
    mq.addListener(handler)
    return () => mq.removeListener(handler)
  }, [])

  return { isMobile }
}