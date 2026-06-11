import { useNavigate } from 'react-router-dom'
import { useChatStore } from '../store/chatStore'
import { generateAvatar } from '../utils/generateAvatar'
import * as roomService from '../services/roomService'
import { useSocket } from '../hooks/useSocket'
import { REQUEST_ACCEPTED, REQUEST_REJECTED } from '../socket/socketEvents'
import { useMobileNav } from '../hooks/useMobileNav'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import MobilePageHeader from '../components/MobilePageHeader'
import '../styles/mobile-page.css'

// ── Shared inner content ────────────────────────────────────────────────────
function MessageRequestsContent({ pendingRooms, onAccept, onReject, navigate }) {
  return (
    <div style={s.list}>
      {pendingRooms.length === 0 ? (
        <div style={s.empty}>
          <p style={s.emptyIcon}>📭</p>
          <p style={s.emptyText}>No message requests</p>
          <p style={s.emptySub}>When someone sends you a message request, it will appear here.</p>
        </div>
      ) : (
        pendingRooms.map(room => {
          const sender    = room.otherUser || {}
          const avatarSrc = sender.avatar || generateAvatar(sender.name || 'User')
          const name      = sender.name || 'Unknown User'

          return (
            <div
              key={room.id}
              style={s.item}
              onClick={() => navigate(`/chat/${room.id}`)}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-2)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <img src={avatarSrc} alt={name} style={s.avatar} />
              <div style={s.info}>
                <p style={s.name}>{name}</p>
                <p style={s.preview}>
                  {room.lastMessage?.content || 'Sent you a message request'}
                </p>
              </div>
              <div style={s.actions} onClick={e => e.stopPropagation()}>
                <button style={s.rejectBtn} onClick={(e) => onReject(e, room)}>Delete</button>
                <button style={s.acceptBtn} onClick={(e) => onAccept(e, room)}>Accept</button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

function MessageRequests() {
  const navigate          = useNavigate()
  const pendingRooms      = useChatStore(state => state.pendingRooms)
  const moveToAccepted    = useChatStore(state => state.moveToAccepted)
  const removePendingRoom = useChatStore(state => state.removePendingRoom)
  const { emit }          = useSocket()
  const { isMobile }      = useMobileNav()

  const handleAccept = async (e, room) => {
    e.stopPropagation()
    try {
      await roomService.acceptRequest(room.id)
      moveToAccepted(room.id)
      emit(REQUEST_ACCEPTED, { roomId: room.id })
      navigate(`/chat/${room.id}`)
    } catch (err) {
      console.error('Accept failed:', err)
    }
  }

  const handleReject = async (e, room) => {
    e.stopPropagation()
    try {
      await roomService.rejectRequest(room.id)
      removePendingRoom(room.id)
      emit(REQUEST_REJECTED, { roomId: room.id })
    } catch (err) {
      console.error('Reject failed:', err)
    }
  }

  const sharedProps = { pendingRooms, onAccept: handleAccept, onReject: handleReject, navigate }

  // ── MOBILE: full-screen page ────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className='mph-shell'>
        <MobilePageHeader
          title='Message Requests'
          fallbackPath='/'
          trailing={
            pendingRooms.length > 0
              ? <span className='mph-status-pill'>{pendingRooms.length} pending</span>
              : null
          }
        />
        <div className='mph-content'>
          <MessageRequestsContent {...sharedProps} />
        </div>
      </div>
    )
  }

  // ── DESKTOP: original layout unchanged ──────────────────────────────────────
  return (
    <div style={s.shell}>
      <Navbar />
      <div style={s.body}>
        <Sidebar />
        <div style={s.main}>

          {/* Header */}
          <div style={s.topBar}>
            <button style={s.backBtn} onClick={() => navigate(-1)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div>
              <p style={s.topBarTitle}>Message Requests</p>
              <p style={s.topBarSub}>{pendingRooms.length} pending</p>
            </div>
          </div>

          {/* List */}
          <MessageRequestsContent {...sharedProps} />

        </div>
      </div>
    </div>
  )
}

const s = {
  shell:      { height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)', overflow: 'hidden' },
  body:       { flex: 1, display: 'flex', overflow: 'hidden' },
  main:       { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topBar:     { display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', height: 59, minHeight: 59, backgroundColor: 'var(--color-header-bg)', borderBottom: '1px solid var(--color-border)', flexShrink: 0 },
  backBtn:    { background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  topBarTitle:{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 1 },
  topBarSub:  { fontSize: 12, color: 'var(--color-text-muted)' },
  list:       { flex: 1, overflowY: 'auto' },
  empty:      { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, padding: 40, marginTop: 60 },
  emptyIcon:  { fontSize: 48, opacity: 0.3, marginBottom: 8 },
  emptyText:  { fontSize: 16, fontWeight: 600, color: 'var(--color-text)' },
  emptySub:   { fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: 280 },
  item:       { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--color-divider)', transition: 'background 0.15s' },
  avatar:     { width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  info:       { flex: 1, minWidth: 0 },
  name:       { fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 3 },
  preview:    { fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  actions:    { display: 'flex', gap: 8, flexShrink: 0 },
  rejectBtn:  { padding: '6px 14px', borderRadius: 8, backgroundColor: 'transparent', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  acceptBtn:  { padding: '6px 14px', borderRadius: 8, backgroundColor: 'var(--color-primary)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
}

export default MessageRequests