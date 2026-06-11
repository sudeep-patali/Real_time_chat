/**
 * GoogleSignInButton
 *
 * Renders a styled "Continue with Google" button using the Google Identity
 * Services (GIS) SDK loaded via a <script> tag in index.html.
 *
 * Usage:
 *   <GoogleSignInButton onToken={(idToken) => handleGoogleToken(idToken)} />
 *
 * The parent is responsible for calling the backend with the idToken.
 *
 * Prerequisites — add to frontend/index.html <head>:
 *   <script src="https://accounts.google.com/gsi/client" async defer></script>
 *
 * And set in frontend/.env:
 *   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
 */

import { useEffect, useRef, useState } from 'react'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export function GoogleSignInButton({ onToken, disabled = false, label = 'Continue with Google' }) {
  const containerRef = useRef(null)
  const [sdkReady, setSdkReady] = useState(false)
  const [renderFailed, setRenderFailed] = useState(false)

  // Wait for the GIS SDK to load
  useEffect(() => {
    if (typeof window.google !== 'undefined') {
      setSdkReady(true)
      return
    }
    const interval = setInterval(() => {
      if (typeof window.google !== 'undefined') {
        setSdkReady(true)
        clearInterval(interval)
      }
    }, 200)
    const timeout = setTimeout(() => {
      clearInterval(interval)
      setRenderFailed(true)
    }, 10000)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [])

  // Initialize and render the Google button once SDK is ready
  useEffect(() => {
    if (!sdkReady || !GOOGLE_CLIENT_ID || !containerRef.current) return

    try {
      window.google.accounts.id.initialize({
        client_id:  GOOGLE_CLIENT_ID,
        callback:   (response) => {
          if (response.credential) {
            onToken(response.credential)
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      })

      window.google.accounts.id.renderButton(containerRef.current, {
        type:  'standard',
        theme: 'filled_black',
        size:  'large',
        width: '100%',
        text:  'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
      })
    } catch (err) {
      console.error('[GoogleSignInButton] render failed:', err)
      setRenderFailed(false) // fall through to custom button
    }
  }, [sdkReady, onToken])

  // If VITE_GOOGLE_CLIENT_ID is not set, render nothing (feature disabled)
  if (!GOOGLE_CLIENT_ID) return null

  // If GIS SDK timed out, show a plain fallback button
  if (renderFailed) {
    return (
      <button
        type='button'
        className='auth-google-btn'
        disabled={disabled}
        onClick={() => alert('Google Sign-In is not available right now.')}
      >
        <GoogleIcon />
        <span>{label}</span>
      </button>
    )
  }

  // Wrap the GIS-rendered button so we can apply our own disabled overlay
  return (
    <div
      className={`auth-google-wrapper${disabled ? ' auth-google-disabled' : ''}`}
      aria-disabled={disabled}
    >
      <div ref={containerRef} className='auth-google-inner' />
      {disabled && <div className='auth-google-overlay' />}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width='18' height='18' viewBox='0 0 18 18' aria-hidden='true'>
      <path fill='#4285F4' d='M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z'/>
      <path fill='#34A853' d='M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z'/>
      <path fill='#FBBC05' d='M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z'/>
      <path fill='#EA4335' d='M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z'/>
    </svg>
  )
}

export default GoogleSignInButton