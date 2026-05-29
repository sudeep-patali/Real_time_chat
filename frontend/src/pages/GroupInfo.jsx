import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChatStore } from '../store/chatStore'
import * as groupService from '../services/groupService'
import * as messageService from '../services/messageService'
import '../styles/chat.css'
import '../styles/global.css'

const DUMMY_GROUPS = {
  room3: {
    id: 'room3',
    name: 'Team Wheeltrix',
    description: 'Official group for Team Wheeltrix. Share updates, plans, and stay connected.',
    createdAt: '2024-01-15T10:00:00.000Z',
    members: [
      { id: '1', name: 'Test User', role: 'admin',  color: '#5b8def' },
      { id: '2', name: 'Alex',      role: 'member', color: '#ef6b5b' },
      { id: '3', name: 'Jordan',    role: 'member', color: '#5b9ef7' },
    ],
  },
}

function GroupInfo() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const rooms = useChatStore(state => state.rooms)
  const setRooms = useChatStore(state => state.setRooms)
  const setMessages = useChatStore(state => state.setMessages)
  const storeRoom = rooms.find(r => r.id === roomId)

  const [group, setGroup] = useState(
    DUMMY_GROUPS[roomId] ?? {
      id: roomId,
      name: storeRoom?.groupName ?? 'Group',
      description: '',
      createdAt: new Date().toISOString(),
      members: [],
    }
  )
  const [media, setMedia] = useState([1, 2, 3, 4, 5, 6])

  // Swap in when backend is ready:
  // useEffect(() => {
  //   groupService.getGroupById(roomId).then(res => setGroup(res.data.room))
  //   messageService.getSharedMedia(roomId).then(res => setMedia(res.data.media))
  // }, [roomId])

  const initials = group.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  const handleClearChat = async () => {
    // await messageService.clearChat(roomId)
    setMessages([])
    navigate(-1)
  }

  const handleExitGroup = async () => {
    // await groupService.exitGroup(roomId)
    setRooms(rooms.filter(r => r.id !== roomId))
    navigate('/')
  }

  const handleRemoveMember = async (userId) => {
    // await groupService.removeMember(roomId, userId)
    setGroup(g => ({ ...g, members: g.members.filter(m => m.id !== userId) }))
  }

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span style={s.topBarTitle}>Group Info</span>
      </div>

      <div style={s.scroll}>
        <div style={s.inner}>

          <div style={s.heroCard}>
            <div style={s.avatarRing}>
              <div style={s.avatar}>{initials}</div>
            </div>
            <div style={s.heroText}>
              <h2 style={s.name}>{group.name}</h2>
              <p style={s.memberCount}>Group · {group.members.length} members</p>
            </div>
            <div style={s.actionRow}>
              {[
                { svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, label: 'Message', onClick: () => navigate(`/group/${roomId}`) },
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
              <p style={s.infoValue}>{group.description || 'No group description'}</p>
            </div>
            <div style={s.rowDivider} />
            <div style={s.infoRow}>
              <svg style={s.infoIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <div>
                <p style={s.infoValue}>Created {formatDate(group.createdAt)}</p>
                <p style={s.infoSub}>Group created</p>
              </div>
            </div>
          </div>

          <div style={s.section}>
            <div style={s.sectionHeader}>
              <p style={s.sectionLabel}>{group.members.length} Members</p>
              <button style={s.seeAll}>Add member +</button>
            </div>
            {group.members.map((member, i) => (
              <div key={member.id}>
                <div style={s.memberRow} onClick={() => navigate(`/user/${member.id}`)}>
                  <div style={{ ...s.memberAvatar, background: `linear-gradient(135deg, ${member.color}aa, ${member.color})` }}>
                    {member.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={s.memberInfo}>
                    <span style={s.memberName}>{member.name}</span>
                    <span style={s.memberSub}>{member.role === 'admin' ? 'Group Admin' : 'Member'}</span>
                  </div>
                  {member.role === 'admin'
                    ? <span style={s.adminBadge}>Admin</span>
                    : <button style={s.removeBtn} onClick={e => { e.stopPropagation(); handleRemoveMember(member.id) }}>Remove</button>
                  }
                </div>
                {i < group.members.length - 1 && <div style={s.rowDivider} />}
              </div>
            ))}
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
              { icon: '🔕', label: 'Mute Notifications', danger: false, onClick: () => {} },
              { icon: '🗑',  label: 'Clear Chat',         danger: false, onClick: handleClearChat },
              { icon: '🚪', label: 'Exit Group',          danger: true,  onClick: handleExitGroup },
              { icon: '⚠️', label: 'Report Group',        danger: true,  onClick: () => {} },
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
  avatarRing: { width: 96, height: 96, borderRadius: '50%', border: '3px solid rgba(124,110,247,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  avatar: { width: 84, height: 84, borderRadius: '50%', background: 'linear-gradient(135deg, #9c8ef7, #7c6ef7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 30, letterSpacing: '1px' },
  heroText: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  name: { fontSize: 20, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '0.2px' },
  memberCount: { fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 400 },
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
  infoValue: { fontSize: 14, color: 'var(--color-text)', fontWeight: 500, lineHeight: 1.5 },
  infoSub: { fontSize: 11, color: 'var(--color-text-dim)', marginTop: 2 },
  rowDivider: { height: 1, background: 'var(--color-divider)', margin: '4px 0' },
  memberRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', cursor: 'pointer' },
  memberAvatar: { width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 },
  memberInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  memberName: { fontSize: 14, fontWeight: 500, color: 'var(--color-text)' },
  memberSub: { fontSize: 11, color: 'var(--color-text-dim)' },
  adminBadge: { fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', letterSpacing: '0.3px', flexShrink: 0 },
  removeBtn: { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: 'rgba(241,92,109,0.1)', color: 'var(--color-error)', border: 'none', cursor: 'pointer', flexShrink: 0 },
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

export default GroupInfo