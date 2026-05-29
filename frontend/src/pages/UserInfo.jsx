import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChatStore } from '../store/chatStore'
import * as userService from '../services/userService'
import * as messageService from '../services/messageService'
import '../styles/chat.css'
import '../styles/global.css'

const DUMMY_USERS = {
  '1': { id: '1', name: 'Test User', about: 'Hey there! I am using Wheeltrix.', phone: '+91 98765 43210', email: 'test@wheeltrix.com' },
  '2': { id: '2', name: 'Alex',      about: 'Available',                         phone: '+91 91234 56789', email: 'alex@wheeltrix.com' },
  '3': { id: '3', name: 'Jordan',    about: 'Busy 🎧',                           phone: '+91 99887 76655', email: 'jordan@wheeltrix.com' },
}
const AVATAR_COLORS = { '1': '#5b8def', '2': '#ef6b5b', '3': '#5b9ef7' }

function UserInfo() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const onlineUsers = useChatStore(state => state.onlineUsers)
  const rooms = useChatStore(state => state.rooms)
  const setMessages = useChatStore(state => state.setMessages)

  const [user, setUser] = useState(DUMMY_USERS[userId] ?? { id: userId, name: 'Unknown User', about: '', phone: '', email: '' })
  const [media, setMedia] = useState([1, 2, 3, 4, 5, 6])
  const [loading, setLoading] = useState(false)

  const isOnline = onlineUsers.includes(userId)
  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const avatarColor = AVATAR_COLORS[userId] ?? '#7c6ef7'

  const room = rooms.find(r => !r.isGroup && r.participantIds?.includes(userId))

  // Swap these in when backend is ready:
  // useEffect(() => {
  //   userService.getUserById(userId).then(res => setUser(res.data.user))
  //   if (room) messageService.getSharedMedia(room.id).then(res => setMedia(res.data.media))
  // }, [userId])

  const handleClearChat = async () => {
    if (!room) return
    // await messageService.clearChat(room.id)
    setMessages([])
    navigate(-1)
  }

  const handleBlock = async () => {
    // await userService.blockUser(userId)
    navigate('/')
  }

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span style={s.topBarTitle}>Contact Info</span>
      </div>

      <div style={s.scroll}>
        <div style={s.inner}>

          <div style={s.heroCard}>
            <div style={{ ...s.avatarRing, borderColor: avatarColor + '55' }}>
              <div style={{ ...s.avatar, background: `linear-gradient(135deg, ${avatarColor}cc, ${avatarColor})` }}>
                {initials}
              </div>
            </div>
            <div style={s.heroText}>
              <h2 style={s.name}>{user.name}</h2>
              <div style={{ ...s.onlineBadge, background: isOnline ? 'rgba(0,168,132,0.12)' : 'rgba(255,255,255,0.05)', color: isOnline ? '#00a884' : 'var(--color-text-dim)' }}>
                <span style={{ ...s.onlineDot, background: isOnline ? '#00a884' : 'var(--color-text-dim)' }} />
                {isOnline ? 'Online' : 'Offline'}
              </div>
            </div>
            <div style={s.actionRow}>
              {[
                { svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, label: 'Message', onClick: () => room && navigate(`/chat/${room.id}`) },
                { svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, label: 'Mute', onClick: () => {} },
                { svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>, label: 'Search', onClick: () => {} },
              ].map(a => (
                <button key={a.label} style={s.actionBtn} onClick={a.onClick}>
                  <span style={s.actionIconWrap}>{a.svg}</span>
                  <span style={s.actionLabel}>{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={s.section}>
            <p style={s.sectionLabel}>About</p>
            <div style={s.infoRow}>
              <svg style={s.infoIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p style={s.infoValue}>{user.about || '—'}</p>
            </div>
          </div>

          <div style={s.section}>
            <p style={s.sectionLabel}>Contact</p>
            <div style={s.infoRow}>
              <svg style={s.infoIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.42 2 2 0 0 1 3.56 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.73a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <div>
                <p style={s.infoValue}>{user.phone || '—'}</p>
                <p style={s.infoSub}>Mobile</p>
              </div>
            </div>
            <div style={s.rowDivider} />
            <div style={s.infoRow}>
              <svg style={s.infoIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <div>
                <p style={s.infoValue}>{user.email || '—'}</p>
                <p style={s.infoSub}>Personal</p>
              </div>
            </div>
          </div>

          <div style={s.section}>
            <div style={s.sectionHeader}>
              <p style={s.sectionLabel}>Shared Media</p>
              <button style={s.seeAll}>See all →</button>
            </div>
            <div style={s.mediaGrid}>
              {media.map((item, i) => (
                <div key={i} style={s.mediaThumb}>
                  {item.url
                    ? <img src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={s.mediaOverlay} />
                  }
                </div>
              ))}
            </div>
          </div>

          <div style={s.section}>
            <div style={{ ...s.docRow, borderBottom: '1px solid var(--color-divider)' }}>
              <svg style={s.infoIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span style={s.docLabel}>Documents</span>
              <span style={s.docCount}>0</span>
            </div>
            <div style={s.docRow}>
              <svg style={s.infoIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              <span style={s.docLabel}>Links</span>
              <span style={s.docCount}>0</span>
            </div>
          </div>

          <div style={s.dangerSection}>
            {[
              { icon: '🗑', label: 'Clear Chat',        danger: false, onClick: handleClearChat },
              { icon: '🚫', label: `Block ${user.name}`, danger: false, onClick: handleBlock },
              { icon: '⚠️', label: `Report ${user.name}`, danger: true, onClick: () => {} },
            ].map((item, i, arr) => (
              <div key={item.label}>
                <button style={{ ...s.dangerBtn, color: item.danger ? 'var(--color-error)' : 'var(--color-text-muted)' }} onClick={item.onClick}>
                  <span style={s.dangerIcon}>{item.icon}</span>
                  {item.label}
                </button>
                {i < arr.length - 1 && <div style={s.rowDivider} />}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}

const s = {
  page: { height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)', overflow: 'hidden' },
  topBar: { display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', height: 59, minHeight: 59, backgroundColor: 'var(--color-header-bg)', borderBottom: '1px solid var(--color-border)', flexShrink: 0 },
  backBtn: { background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  topBarTitle: { fontSize: 16, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '0.1px' },
  scroll: { flex: 1, overflowY: 'auto', backgroundColor: 'var(--color-bg)' },
  inner: { maxWidth: 680, margin: '0 auto', padding: '24px 16px 48px', display: 'flex', flexDirection: 'column', gap: 12 },
  heroCard: { backgroundColor: 'var(--color-surface)', borderRadius: 12, padding: '28px 24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, border: '1px solid var(--color-border)' },
  avatarRing: { width: 96, height: 96, borderRadius: '50%', border: '3px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  avatar: { width: 84, height: 84, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 30, letterSpacing: '1px' },
  heroText: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  name: { fontSize: 20, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '0.2px' },
  onlineBadge: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 20 },
  onlineDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  actionRow: { display: 'flex', gap: 8, marginTop: 8, width: '100%', justifyContent: 'center' },
  actionBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', cursor: 'pointer', padding: '10px 20px', borderRadius: 10, transition: 'background 0.15s', flex: 1, maxWidth: 100 },
  actionIconWrap: { color: 'var(--color-primary)', display: 'flex', alignItems: 'center' },
  actionLabel: { fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500, whiteSpace: 'nowrap' },
  section: { backgroundColor: 'var(--color-surface)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 10 },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { fontSize: 10, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 2 },
  seeAll: { background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  infoRow: { display: 'flex', alignItems: 'flex-start', gap: 14 },
  infoIcon: { color: 'var(--color-text-dim)', flexShrink: 0, marginTop: 2 },
  infoValue: { fontSize: 14, color: 'var(--color-text)', fontWeight: 500, lineHeight: 1.4 },
  infoSub: { fontSize: 11, color: 'var(--color-text-dim)', marginTop: 2 },
  rowDivider: { height: 1, background: 'var(--color-divider)', margin: '4px 0' },
  mediaGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 },
  mediaThumb: { aspectRatio: '1', backgroundColor: 'var(--color-surface-2)', borderRadius: 8, position: 'relative', overflow: 'hidden', border: '1px solid var(--color-border)' },
  mediaOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(135deg, var(--color-surface-2) 0%, var(--color-border) 100%)' },
  docRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' },
  docLabel: { flex: 1, fontSize: 14, color: 'var(--color-text)', fontWeight: 500 },
  docCount: { fontSize: 12, color: 'var(--color-text-dim)', background: 'var(--color-surface-2)', borderRadius: 20, padding: '2px 10px', fontWeight: 600 },
  dangerSection: { backgroundColor: 'var(--color-surface)', borderRadius: 12, padding: '4px 20px', border: '1px solid var(--color-border)' },
  dangerBtn: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: 'none', border: 'none', padding: '13px 0', fontSize: 14, cursor: 'pointer', fontWeight: 500, textAlign: 'left', transition: 'opacity 0.15s' },
  dangerIcon: { fontSize: 16 },
}

export default UserInfo