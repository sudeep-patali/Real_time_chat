import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChatStore } from '../store/chatStore'
import { useNotificationStore } from '../store/notificationStore'
import { useSocket } from '../hooks/useSocket'
import * as userService from '../services/userService'
import * as roomService from '../services/roomService'
import * as messageService from '../services/messageService'
import MediaGallery from '../components/MediaGallery'
import { USER_ONLINE } from '../socket/socketEvents'
import '../styles/chat.css'

// ── Animated online indicator ──────────────────────────────────────────────
function OnlinePulse({ isOnline }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 12, fontWeight: 600,
      color: isOnline ? '#00a884' : 'var(--color-text-dim)',
      background: isOnline ? 'rgba(0,168,132,0.1)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${isOnline ? 'rgba(0,168,132,0.25)' : 'var(--color-border)'}`,
      borderRadius: 20, padding: '4px 12px',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: isOnline ? '#00a884' : 'var(--color-text-dim)',
        boxShadow: isOnline ? '0 0 0 3px rgba(0,168,132,0.2)' : 'none',
        animation: isOnline ? 'pulse 2s infinite' : 'none',
      }} />
      {isOnline ? 'Online' : 'Offline'}
    </span>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color = 'var(--color-primary)' }) {
  return (
    <div style={{
      flex: 1, backgroundColor: 'var(--color-surface-2)', borderRadius: 10,
      border: '1px solid var(--color-border)', padding: '12px 10px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: 10, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{label}</span>
    </div>
  )
}

function UserInfo() {
  const { userId }   = useParams()
  const navigate     = useNavigate()
  const { on, off }  = useSocket()

  const onlineUsers    = useChatStore(state => state.onlineUsers)
  const rooms          = useChatStore(state => state.rooms)
  const setMessages    = useChatStore(state => state.setMessages)
  const toggleMuteRoom = useChatStore(state => state.toggleMuteRoom)
  const clearUnread    = useNotificationStore(state => state.clearUnread)

  const [user,         setUser]         = useState(null)
  const [media,        setMedia]        = useState([])
  const [docs,         setDocs]         = useState([])
  const [totalMsgs,    setTotalMsgs]    = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [busy,         setBusy]         = useState('')
  const [liveOnline,   setLiveOnline]   = useState(null) // null = use store
  const [liveLastSeen, setLiveLastSeen] = useState(null)

  // Find the shared room
  const room = rooms.find(r =>
    !r.isGroup && r.participantIds?.some(p => {
      const pid = p?.id || p?._id || p
      return pid?.toString() === userId?.toString()
    })
  )
  const rid     = room?._id || room?.id
  const isMuted = room?.isMuted || false

  // Effective online state: prefer live socket update, fall back to store
  const isOnline = liveOnline !== null
    ? liveOnline
    : onlineUsers.includes(userId?.toString())

  // ── Load user ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    setLoading(true); setError(null)
    userService.getUserById(userId)
      .then(res => setUser(res.data.user))
      .catch(() => setError('Could not load user info.'))
      .finally(() => setLoading(false))
  }, [userId])

  // ── Load shared media ──────────────────────────────────────────────────
  useEffect(() => {
    if (!rid) return
    roomService.getRoomMedia(rid)
      .then(res => { setMedia(res.data.media || []); setDocs(res.data.documents || []) })
      .catch(() => {})
  }, [rid])

  // ── Load total messages ────────────────────────────────────────────────
  useEffect(() => {
    if (!rid) return
    messageService.fetchHistory(rid)
      .then(res => setTotalMsgs((res.data.messages || []).length))
      .catch(() => {})
  }, [rid])

  // ── Real-time online status via socket ─────────────────────────────────
  useEffect(() => {
    const handle = ({ userId: uid, isOnline: online, lastSeen }) => {
      if (uid?.toString() !== userId?.toString()) return
      setLiveOnline(online)
      if (lastSeen) setLiveLastSeen(lastSeen)
    }
    on(USER_ONLINE, handle)
    return () => off(USER_ONLINE, handle)
  }, [userId, on, off])

  // ── Clear unread when viewing this chat ───────────────────────────────
  useEffect(() => {
    if (rid) clearUnread(rid)
  }, [rid, clearUnread])

  const handleClearChat = async () => {
    if (!rid || !window.confirm('Clear all messages? This cannot be undone.')) return
    setBusy('clear')
    try { await roomService.clearChat(rid); setMessages([]); navigate(-1) }
    catch { alert('Failed to clear chat.') }
    finally { setBusy('') }
  }

  const handleBlock = async () => {
    if (!window.confirm(`${user?.isBlocked ? 'Unblock' : 'Block'} ${user?.name}?`)) return
    setBusy('block')
    try {
      const res = await userService.blockUser(userId)
      setUser(u => ({ ...u, isBlocked: res.data.isBlocked }))
    } catch { alert('Action failed.') }
    finally { setBusy('') }
  }

  const handleMute = async () => {
    if (!rid) return
    setBusy('mute')
    try { await roomService.muteRoom(rid); toggleMuteRoom(rid) }
    catch { alert('Failed to mute.') }
    finally { setBusy('') }
  }

  const handleReport = async () => {
    const reason = window.prompt(`Reason for reporting ${user?.name}? (optional)`)
    if (reason === null) return
    setBusy('report')
    try { const r = await userService.reportUser(userId, reason); alert(r.data.message || 'Report submitted.') }
    catch { alert('Failed to submit report.') }
    finally { setBusy('') }
  }

  if (loading) return <LoadingScreen title="Contact Info" onBack={() => navigate(-1)} />
  if (error || !user) return <ErrorScreen title="Contact Info" msg={error} onBack={() => navigate(-1)} />

  const initials = (user.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const memberSince = user.memberSince
    ? new Date(user.memberSince).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null

  const lastSeenRaw = liveLastSeen || user.lastSeen
  const lastSeenText = isOnline
    ? 'Online'
    : lastSeenRaw
      ? `Last seen ${new Date(lastSeenRaw).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
      : 'Offline'

  return (
    <div style={s.page}>
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span style={s.topBarTitle}>Contact Info</span>
      </div>

      <div style={s.scroll}>
        <div style={s.inner}>

          {/* ── Hero Card ────────────────────────────────────────────────── */}
          <div style={s.heroCard}>
            {/* Avatar with online ring */}
            <div style={{ ...s.avatarRing, borderColor: isOnline ? '#00a884' : 'rgba(124,110,247,0.3)' }}>
              {user.avatar
                ? <img src={user.avatar} alt={user.name} style={s.avatarImg} />
                : <div style={s.avatar}>{initials}</div>
              }
              {/* Live online dot on avatar */}
              {isOnline && <span style={s.avatarOnlineDot} />}
            </div>

            <h2 style={s.name}>{user.name}</h2>
            <OnlinePulse isOnline={isOnline} />

            {user.isBlocked && (
              <div style={s.blockedBadge}>🚫 You have blocked this user</div>
            )}

            {/* Stats Row */}
            {(totalMsgs !== null || media.length > 0) && (
              <div style={s.statsRow}>
                {totalMsgs !== null && (
                  <StatCard icon="💬" label="Messages" value={totalMsgs} />
                )}
                <StatCard icon="🖼️" label="Media" value={media.length} />
                <StatCard icon="📎" label="Docs" value={docs.length} />
              </div>
            )}

            {/* Action buttons */}
            <div style={s.actionRow}>
              <button style={s.actionBtn} onClick={() => rid && navigate(`/chat/${rid}`)} disabled={!rid}>
                <span style={s.actionIconWrap}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </span>
                <span style={s.actionLabel}>Message</span>
              </button>

              <button style={{ ...s.actionBtn, opacity: busy === 'mute' ? 0.5 : 1 }}
                onClick={handleMute} disabled={!rid || busy === 'mute'}>
                <span style={{ ...s.actionIconWrap, color: isMuted ? '#f59e0b' : 'var(--color-primary)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    {isMuted && <line x1="1" y1="1" x2="23" y2="23"/>}
                  </svg>
                </span>
                <span style={s.actionLabel}>{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>
            </div>
          </div>

          {/* ── About ──────────────────────────────────────────────────────── */}
          <div style={s.section}>
            <p style={s.sectionLabel}>About</p>
            <div style={s.infoRow}>
              <svg style={s.infoIcon} width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p style={s.infoValue}>{user.bio || 'Hey there! I am using this app.'}</p>
            </div>
          </div>

          {/* ── Contact ─────────────────────────────────────────────────────── */}
          <div style={s.section}>
            <p style={s.sectionLabel}>Contact</p>
            <div style={s.infoRow}>
              <svg style={s.infoIcon} width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <div>
                <p style={s.infoValue}>{user.email}</p>
                <p style={s.infoSub}>Email</p>
              </div>
            </div>

            {/* Last seen */}
            <div style={s.rowDivider} />
            <div style={s.infoRow}>
              <svg style={s.infoIcon} width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <div>
                <p style={{ ...s.infoValue, color: isOnline ? '#00a884' : 'var(--color-text)' }}>{lastSeenText}</p>
                <p style={s.infoSub}>Last Seen</p>
              </div>
            </div>

            {memberSince && (
              <>
                <div style={s.rowDivider} />
                <div style={s.infoRow}>
                  <svg style={s.infoIcon} width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <div>
                    <p style={s.infoValue}>Member since {memberSince}</p>
                    <p style={s.infoSub}>Joined</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Shared Media & Documents ─────────────────────────────────── */}
          <div style={s.section}>
            <p style={s.sectionLabel}>Shared Media & Documents</p>
            <MediaGallery media={media} documents={docs} />
          </div>

          {/* ── Danger Actions ───────────────────────────────────────────── */}
          <div style={s.dangerSection}>
            {rid && (
              <>
                <button style={{ ...s.dangerBtn, color: 'var(--color-text-muted)', opacity: busy === 'clear' ? 0.5 : 1 }}
                  onClick={handleClearChat} disabled={busy === 'clear'}>
                  <span style={s.dangerIcon}>🗑</span>
                  {busy === 'clear' ? 'Clearing...' : 'Clear Chat'}
                </button>
                <div style={s.rowDivider} />
              </>
            )}
            <button style={{ ...s.dangerBtn, color: 'var(--color-text-muted)', opacity: busy === 'block' ? 0.5 : 1 }}
              onClick={handleBlock} disabled={busy === 'block'}>
              <span style={s.dangerIcon}>🚫</span>
              {busy === 'block' ? 'Please wait...' : (user.isBlocked ? `Unblock ${user.name}` : `Block ${user.name}`)}
            </button>
            <div style={s.rowDivider} />
            <button style={{ ...s.dangerBtn, color: 'var(--color-error)', opacity: busy === 'report' ? 0.5 : 1 }}
              onClick={handleReport} disabled={busy === 'report'}>
              <span style={s.dangerIcon}>⚠️</span>
              {busy === 'report' ? 'Submitting...' : `Report ${user.name}`}
            </button>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0   rgba(0,168,132,0.5); }
          70%  { box-shadow: 0 0 0 6px rgba(0,168,132,0);   }
          100% { box-shadow: 0 0 0 0   rgba(0,168,132,0);   }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function LoadingScreen({ title, onBack }) {
  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span style={s.topBarTitle}>{title}</span>
      </div>
      <div style={s.centered}>
        <div style={s.spinner} />
        <p style={s.loadingText}>Loading...</p>
      </div>
    </div>
  )
}

function ErrorScreen({ title, msg, onBack }) {
  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span style={s.topBarTitle}>{title}</span>
      </div>
      <div style={s.centered}>
        <p style={{ color: 'var(--color-error)', fontSize: 14 }}>{msg || 'Not found.'}</p>
      </div>
    </div>
  )
}

const s = {
  page:          { height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)', overflow: 'hidden' },
  topBar:        { display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', height: 59, minHeight: 59, backgroundColor: 'var(--color-header-bg)', borderBottom: '1px solid var(--color-border)', flexShrink: 0 },
  backBtn:       { background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  topBarTitle:   { fontSize: 16, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '0.1px' },
  scroll:        { flex: 1, overflowY: 'auto', backgroundColor: 'var(--color-bg)' },
  inner:         { maxWidth: 680, margin: '0 auto', padding: '24px 16px 48px', display: 'flex', flexDirection: 'column', gap: 12 },
  centered:      { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 },
  spinner:       { width: 28, height: 28, border: '2px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  loadingText:   { fontSize: 13, color: 'var(--color-text-muted)' },
  heroCard:      { backgroundColor: 'var(--color-surface)', borderRadius: 16, padding: '32px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, border: '1px solid var(--color-border)' },
  avatarRing:    { position: 'relative', width: 100, height: 100, borderRadius: '50%', border: '3px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4, transition: 'border-color 0.4s' },
  avatar:        { width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(135deg,#9c8ef7,#7c6ef7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 32 },
  avatarImg:     { width: 88, height: 88, borderRadius: '50%', objectFit: 'cover' },
  avatarOnlineDot: { position: 'absolute', bottom: 4, right: 4, width: 14, height: 14, borderRadius: '50%', background: '#00a884', border: '2px solid var(--color-surface)', animation: 'pulse 2s infinite' },
  name:          { fontSize: 22, fontWeight: 700, color: 'var(--color-text)' },
  statsRow:      { display: 'flex', gap: 8, width: '100%', marginTop: 4 },
  actionRow:     { display: 'flex', gap: 8, marginTop: 4, width: '100%', justifyContent: 'center' },
  actionBtn:     { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', cursor: 'pointer', padding: '10px 20px', borderRadius: 10, flex: 1, maxWidth: 120 },
  actionIconWrap:{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center' },
  actionLabel:   { fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500, whiteSpace: 'nowrap' },
  section:       { backgroundColor: 'var(--color-surface)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 10 },
  sectionLabel:  { fontSize: 10, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 2 },
  infoRow:       { display: 'flex', alignItems: 'flex-start', gap: 14 },
  infoIcon:      { color: 'var(--color-text-dim)', flexShrink: 0, marginTop: 2 },
  infoValue:     { fontSize: 14, color: 'var(--color-text)', fontWeight: 500, lineHeight: 1.4 },
  infoSub:       { fontSize: 11, color: 'var(--color-text-dim)', marginTop: 2 },
  rowDivider:    { height: 1, background: 'var(--color-divider)', margin: '4px 0' },
  dangerSection: { backgroundColor: 'var(--color-surface)', borderRadius: 12, padding: '4px 20px', border: '1px solid var(--color-border)' },
  dangerBtn:     { display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: 'none', border: 'none', padding: '13px 0', fontSize: 14, cursor: 'pointer', fontWeight: 500, textAlign: 'left' },
  dangerIcon:    { fontSize: 16 },
  blockedBadge:  { marginTop: 2, fontSize: 12, fontWeight: 600, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 20, padding: '4px 14px' },
}

export default UserInfo