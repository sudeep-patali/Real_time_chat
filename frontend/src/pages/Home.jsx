import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Zap, Smartphone } from 'lucide-react'
import { useChatStore } from '../store/chatStore'
import { useRooms } from '../hooks/useRooms'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'

function Home() {
  const navigate = useNavigate()
  const rooms    = useChatStore(state => state.rooms)

  useRooms()

  useEffect(() => {
    if (rooms.length > 0) {
      const first = rooms[0]
      navigate(first.isGroup ? `/group/${first.id}` : `/chat/${first.id}`)
    }
  }, [rooms])

  return (
    <div className='home-shell' style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)', overflow: 'hidden' }}>
      <Navbar />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-surface-3)', borderTop: '6px solid var(--color-primary)' }}>
          <div className='home-empty'>

            <div className='home-empty-icon'>
              <svg width='80' height='80' viewBox='0 0 80 80' fill='none' xmlns='http://www.w3.org/2000/svg'>
                <rect x='8' y='12' width='64' height='44' rx='12' fill='var(--color-primary)' opacity='0.12'/>
                <rect x='8' y='12' width='64' height='44' rx='12' stroke='var(--color-primary)' strokeWidth='2' opacity='0.4'/>
                <circle cx='28' cy='34' r='4' fill='var(--color-primary)' opacity='0.5'/>
                <circle cx='40' cy='34' r='4' fill='var(--color-primary)' opacity='0.7'/>
                <circle cx='52' cy='34' r='4' fill='var(--color-primary)'/>
                <path d='M24 56 L32 68 L40 56' fill='var(--color-primary)' opacity='0.3'/>
              </svg>
            </div>

            <h2 className='home-empty-title'>Wheeltrix Web</h2>
            <p className='home-empty-sub'>Select a conversation to start messaging</p>

            <div className='home-empty-pills'>
              <span className='home-empty-pill'>
                <Lock size={12} />
                End-to-end encrypted
              </span>
              <span className='home-empty-pill'>
                <Zap size={12} />
                Real-time
              </span>
              <span className='home-empty-pill'>
                <Smartphone size={12} />
                Cross-platform
              </span>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default Home