import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
    <div style={styles.shell}>
      <Navbar />
      <div style={styles.body}>
        <Sidebar />
        <div style={styles.empty}>
          <div style={styles.emptyInner}>
            <div style={styles.iconWrap}>
              <svg viewBox='0 0 100 100' width='96' height='96' fill='none'
                xmlns='http://www.w3.org/2000/svg' style={{ opacity: 0.18 }}>
                <circle cx='50' cy='50' r='48' stroke='currentColor' strokeWidth='3' />
                <path d='M28 65 C28 65 32 52 50 52 C68 52 72 65 72 65'
                  stroke='currentColor' strokeWidth='3' strokeLinecap='round' />
                <circle cx='50' cy='38' r='10' stroke='currentColor' strokeWidth='3' />
                <circle cx='30' cy='72' r='3' fill='currentColor' />
                <circle cx='50' cy='78' r='3' fill='currentColor' />
                <circle cx='70' cy='72' r='3' fill='currentColor' />
              </svg>
            </div>
            <h2 style={styles.heading}>Wheeltrix Web</h2>
            <p style={styles.sub}>Send and receive messages without keeping your phone online.</p>
            <p style={styles.sub}>Select a conversation from the left to get started.</p>
            <div style={styles.divider} />
            <div style={styles.lockRow}>
              <span style={styles.lockIcon}>🔒</span>
              <span style={styles.lockText}>Your personal messages are end-to-end encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  shell:      { height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)', overflow: 'hidden' },
  body:       { flex: 1, display: 'flex', overflow: 'hidden' },
  empty:      { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-surface-3)', borderTop: '6px solid var(--color-primary)' },
  emptyInner: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: 380, padding: '0 24px', gap: 12 },
  iconWrap:   { color: 'var(--color-text)', marginBottom: 8 },
  heading:    { fontSize: 28, fontWeight: 300, color: 'var(--color-text)', letterSpacing: '0.5px', marginBottom: 4 },
  sub:        { fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.6, maxWidth: 320 },
  divider:    { width: '100%', height: 1, background: 'var(--color-divider)', margin: '16px 0 8px' },
  lockRow:    { display: 'flex', alignItems: 'center', gap: 6 },
  lockIcon:   { fontSize: 12, opacity: 0.5 },
  lockText:   { fontSize: 12, color: 'var(--color-text-dim)' },
}

export default Home