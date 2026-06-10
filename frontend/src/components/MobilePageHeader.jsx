/**
 * MobilePageHeader
 *
 * A native-feeling mobile header with a back button, title, and optional
 * trailing action slot.  Used by the mobile full-screen versions of
 * FindPeople and CreateGroup.
 *
 * The back button first tries `navigate(-1)` (browser history) and falls back
 * to `navigate(fallbackPath)` when there is no history entry to pop.
 */
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import '../styles/mobile-page.css'

function MobilePageHeader({ title, fallbackPath = '/', trailing = null }) {
  const navigate = useNavigate()

  const handleBack = () => {
    // If there is a real history entry, go back; otherwise go to fallback
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(fallbackPath)
    }
  }

  return (
    <div className='mph-bar'>
      <button
        className='mph-back-btn'
        onClick={handleBack}
        aria-label='Go back'
      >
        <ArrowLeft size={22} />
      </button>

      <span className='mph-title'>{title}</span>

      <div className='mph-trailing'>
        {trailing}
      </div>
    </div>
  )
}

export default MobilePageHeader