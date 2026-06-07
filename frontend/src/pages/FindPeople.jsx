import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useChatStore } from '../store/chatStore'
import { useSocket } from '../hooks/useSocket'
import * as userService from '../services/userService'
import * as roomService from '../services/roomService'
import { SEND_REQUEST } from '../socket/socketEvents'
import { generateAvatar } from '../utils/generateAvatar'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'

// ─── Profile Preview Modal (Phase 10.3) ──────────────────────────────────────
function ProfilePreview({ user, onClose, onStartChat, loading }) {
  const avatarSrc = user.avatar || generateAvatar(user.name)

  const handleOverlay = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div style={ps.overlay} onClick={handleOverlay}>
      <div style={ps.modal}>
        <button style={ps.closeBtn} onClick={onClose}>✕</button>

        <div style={ps.avatarWrap}>
          <img src={avatarSrc} alt={user.name} style={ps.avatar} />
          {user.isOnline && <span style={ps.onlineDot} />}
        </div>

        <h2 style={ps.name}>{user.name}</h2>
        <p style={ps.email}>{user.email}</p>
        {user.bio && <p style={ps.bio}>"{user.bio}"</p>}

        <div style={ps.statusRow}>
          <span style={{ ...ps.statusPill, backgroundColor: user.isOnline ? 'rgba(37,211,102,0.15)' : 'rgba(255,255,255,0.06)', color: user.isOnline ? 'var(--color-online)' : 'var(--color-text-dim)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: user.isOnline ? 'var(--color-online)' : 'var(--color-text-dim)', display: 'inline-block', marginRight: 6 }} />
            {user.isOnline ? 'Online now' : 'Offline'}
          </span>
        </div>

        <div style={ps.actions}>
          <button style={ps.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            style={{ ...ps.startBtn, opacity: loading ? 0.7 : 1 }}
            onClick={() => onStartChat(user)}
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={ps.btnSpinner} /> Starting…
              </span>
            ) : (
              <>💬 Start Chat</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

const ps = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 600,
    backgroundColor: 'rgba(0,0,0,0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
    animation: 'fadeSlideIn 0.18s ease',
  },
  modal: {
    position: 'relative',
    backgroundColor: 'var(--color-surface)',
    borderRadius: 18,
    padding: '36px 28px 28px',
    minWidth: 280, maxWidth: 340, width: '100%',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 8,
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    border: '1px solid var(--color-border)',
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 14,
    background: 'none', border: 'none',
    color: 'var(--color-text-muted)', fontSize: 16,
    cursor: 'pointer', width: 28, height: 28,
    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  avatarWrap: { position: 'relative', marginBottom: 4 },
  avatar: {
    width: 88, height: 88, borderRadius: '50%', objectFit: 'cover',
    border: '3px solid var(--color-primary)',
  },
  onlineDot: {
    position: 'absolute', bottom: 4, right: 4,
    width: 16, height: 16, borderRadius: '50%',
    backgroundColor: 'var(--color-online)',
    border: '2px solid var(--color-surface)',
  },
  name: { fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 },
  email: { fontSize: 13, color: 'var(--color-text-muted)', margin: 0 },
  bio: { fontSize: 13, color: 'var(--color-text-dim)', fontStyle: 'italic', textAlign: 'center', margin: '4px 0' },
  statusRow: { margin: '6px 0 12px' },
  statusPill: {
    display: 'inline-flex', alignItems: 'center',
    padding: '4px 12px', borderRadius: 20,
    fontSize: 12, fontWeight: 600,
  },
  actions: { display: 'flex', gap: 10, width: '100%', marginTop: 6 },
  cancelBtn: {
    flex: 1, padding: '11px 0', borderRadius: 10,
    background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
    color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  startBtn: {
    flex: 2, padding: '11px 0', borderRadius: 10,
    background: 'var(--color-primary)', border: 'none',
    color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  btnSpinner: {
    width: 14, height: 14, borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    animation: 'spin 0.7s linear infinite',
    display: 'inline-block',
  },
}

// ─── User Row Card ─────────────────────────────────────────────────────────────
function UserRow({ user, query, onPreview }) {
  const avatarSrc = user.avatar || generateAvatar(user.name)

  const highlight = (text, q) => {
    if (!q.trim()) return text
    const idx = text.toLowerCase().indexOf(q.toLowerCase().trim())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ backgroundColor: 'rgba(0,168,132,0.3)', color: 'var(--color-primary)', borderRadius: 2 }}>
          {text.slice(idx, idx + q.trim().length)}
        </mark>
        {text.slice(idx + q.trim().length)}
      </>
    )
  }

  return (
    <div style={ur.row} onClick={() => onPreview(user)}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-2)'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      <div style={ur.avatarWrap}>
        <img src={avatarSrc} alt={user.name} style={ur.avatar} />
        {user.isOnline && <span style={ur.dot} />}
      </div>
      <div style={ur.info}>
        <p style={ur.name}>{highlight(user.name, query)}</p>
        <p style={ur.email}>{highlight(user.email, query)}</p>
        {user.bio && <p style={ur.bio}>{user.bio}</p>}
      </div>
      <span style={{ ...ur.onlineTag, color: user.isOnline ? 'var(--color-online)' : 'var(--color-text-dim)' }}>
        {user.isOnline ? '● Online' : '○ Offline'}
      </span>
    </div>
  )
}

const ur = {
  row: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 16px', cursor: 'pointer',
    borderBottom: '1px solid var(--color-divider)',
    backgroundColor: 'transparent', transition: 'background 0.12s',
  },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: { width: 50, height: 50, borderRadius: '50%', objectFit: 'cover' },
  dot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: '50%',
    backgroundColor: 'var(--color-online)',
    border: '2px solid var(--color-surface)',
  },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 3 },
  email: { fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 2 },
  bio: { fontSize: 12, color: 'var(--color-text-dim)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
  onlineTag: { fontSize: 11, fontWeight: 600, flexShrink: 0 },
}

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionLabel({ label, count }) {
  return (
    <div style={{ padding: '8px 16px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>{count}</span>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
function FindPeople() {
  const [allUsers, setAllUsers]           = useState([])
  const [query, setQuery]                 = useState('')
  const [loadingAll, setLoadingAll]       = useState(true)
  const [searching, setSearching]         = useState(false)
  const [searchResults, setSearchResults] = useState(null) // null = not searching
  const [previewUser, setPreviewUser]     = useState(null)
  const [startingChat, setStartingChat]   = useState(false)

  const navigate        = useNavigate()
  const { currentUser } = useAuth()
  const { emit }        = useSocket()
  const rooms           = useChatStore(state => state.rooms)
  const debounceRef     = useRef(null)

  // ── Load all users on mount ──────────────────────────────────────────────────
  useEffect(() => {
    userService.getAllUsers()
      .then(res => setAllUsers(res.data.users || []))
      .catch(err => console.error('getAllUsers failed:', err))
      .finally(() => setLoadingAll(false))
  }, [])

  // ── Real-time search with debounce ──────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setSearchResults(null)
      setSearching(false)
      return
    }

    // Instant client-side filter
    const q = query.toLowerCase().trim()
    const clientFiltered = allUsers.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    )
    setSearchResults(clientFiltered)

    // Debounced API search for freshness
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await userService.searchUsers(query)
        setSearchResults(res.data.users || [])
      } catch (err) {
        console.error('search failed:', err)
      } finally {
        setSearching(false)
      }
    }, 350)

    return () => clearTimeout(debounceRef.current)
  }, [query, allUsers])

  // ── Start chat ───────────────────────────────────────────────────────────────
  // FIX (Issue 1 + 3): Build a fully-populated otherUser object and include
  // proper participantIds so the chat header and sidebar display correctly
  // immediately — without waiting for a server re-fetch.
  const handleStartChat = useCallback(async (user) => {
    setStartingChat(true)
    try {
      const existingRoom = rooms.find(r =>
        !r.isGroup &&
        r.participantIds?.some(p => {
          const pid = (p?.id || p?._id || p)?.toString()
          return pid === (user.id || user._id)?.toString()
        })
      )
      if (existingRoom) {
        navigate(`/chat/${existingRoom.id}`)
        return
      }

      const res  = await roomService.createRoom({ participantIds: [user.id || user._id], isGroup: false })
      const room = res.data.room

      const roomId = (room._id || room.id)?.toString()

      // FIX Issue 1: Build a complete otherUser with id, name, avatar so the
      // chat header can display the name immediately.
      const otherUser = {
        id:     (user.id || user._id)?.toString(),
        _id:    (user.id || user._id)?.toString(),
        name:   user.name,
        avatar: user.avatar || null,
        email:  user.email,
      }

      // FIX Issue 1: participantIds must contain full objects (with id + name)
      // so that Chat.jsx getDisplayName() and otherUserId derivation work.
      const participantObjects = (room.participantIds || []).map(p => {
        if (typeof p === 'object') {
          // Already populated from the server response
          return { ...p, id: (p._id || p.id)?.toString(), _id: (p._id || p.id)?.toString() }
        }
        // Raw ID — resolve from known users
        const pid = p?.toString()
        if (pid === otherUser.id) return { ...otherUser }
        return { id: pid, _id: pid, name: currentUser?.name, avatar: currentUser?.avatar }
      })

      // FIX Issue 3: Add the new room to the sender's sidebar immediately
      // (without waiting for a reply from the other user).
      // FIX BUG 1: Include requestedBy as the current user's ID so that
      // Chat.jsx can detect the sender vs receiver and NOT show the
      // MessageRequestBanner to the person who initiated the chat.
      const formattedRoom = {
        id:             roomId,
        _id:            roomId,
        participantIds: participantObjects,
        isGroup:        false,
        groupName:      null,
        avatarUrl:      null,
        status:         room.status || 'pending',
        // The current user IS the requester — pass this through so isPending = false for them
        requestedBy:    currentUser?.id?.toString() || currentUser?._id?.toString(),
        lastMessage:    null,
        otherUser,      // guaranteed populated with name/avatar from the user list
      }

      // Prepend to the store so it shows up in the sidebar right away
      useChatStore.getState().addRoom(formattedRoom)

      // Notify the receiver via Socket.IO
      emit(SEND_REQUEST, {
        receiverId: user.id || user._id,
        roomId,
        senderName: currentUser?.name,
      })

      navigate(`/chat/${roomId}`)
    } catch (err) {
      console.error('Start chat failed:', err)
    } finally {
      setStartingChat(false)
    }
  }, [rooms, navigate, emit, currentUser])

  const displayList  = searchResults !== null ? searchResults : allUsers
  const isFiltering  = query.trim().length > 0
  const onlineUsers  = !isFiltering ? displayList.filter(u => u.isOnline)  : []
  const offlineUsers = !isFiltering ? displayList.filter(u => !u.isOnline) : []

  return (
    <div style={s.shell}>
      <Navbar />
      <div style={s.body}>
        <Sidebar />

        <div style={s.main}>
          {/* Top bar */}
          <div style={s.topBar}>
            <button style={s.backBtn} onClick={() => navigate(-1)} title='Back'>
              <svg width='20' height='20' viewBox='0 0 24 24' fill='none'
                stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                <polyline points='15 18 9 12 15 6' />
              </svg>
            </button>
            <span style={s.topBarTitle}>New Chat</span>
            {searching && <span style={s.searchingPill}>searching…</span>}
          </div>

          {/* Search input */}
          <div style={s.searchWrap}>
            <div style={s.searchBox}>
              <svg style={s.searchIcon} width='16' height='16' viewBox='0 0 24 24' fill='none'
                stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
                <circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/>
              </svg>
              <input
                id='find-people-search'
                name='find-people-search'
                style={s.searchInput}
                type='text'
                placeholder='Search by name or email…'
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
                autoComplete='off'
                spellCheck={false}
              />
              {query && (
                <button style={s.clearBtn} onClick={() => setQuery('')} title='Clear'>✕</button>
              )}
            </div>
          </div>

          {/* User list */}
          <div style={s.list}>

            {loadingAll && !isFiltering && (
              <div style={s.center}>
                <div style={s.spinner} />
                <p style={s.hint}>Loading people…</p>
              </div>
            )}

            {!loadingAll && isFiltering && (
              <>
                {displayList.length > 0 && (
                  <SectionLabel label={`Results for "${query}"`} count={displayList.length} />
                )}
                {displayList.map(user => (
                  <UserRow key={user.id} user={user} query={query} onPreview={setPreviewUser} />
                ))}
                {displayList.length === 0 && !searching && (
                  <div style={s.center}>
                    <p style={s.emptyIcon}>🔍</p>
                    <p style={s.emptyText}>No results for "{query}"</p>
                    <p style={s.hint}>Try a different name or email</p>
                  </div>
                )}
              </>
            )}

            {!loadingAll && !isFiltering && (
              <>
                {allUsers.length === 0 && (
                  <div style={s.center}>
                    <p style={s.emptyIcon}>👥</p>
                    <p style={s.emptyText}>No other users yet</p>
                    <p style={s.hint}>Invite friends to join!</p>
                  </div>
                )}

                {onlineUsers.length > 0 && (
                  <>
                    <SectionLabel label='Online' count={onlineUsers.length} />
                    {onlineUsers.map(user => (
                      <UserRow key={user.id} user={user} query='' onPreview={setPreviewUser} />
                    ))}
                  </>
                )}

                {offlineUsers.length > 0 && (
                  <>
                    <SectionLabel label='People' count={offlineUsers.length} />
                    {offlineUsers.map(user => (
                      <UserRow key={user.id} user={user} query='' onPreview={setPreviewUser} />
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Profile Preview Modal */}
      {previewUser && (
        <ProfilePreview
          user={previewUser}
          onClose={() => setPreviewUser(null)}
          onStartChat={handleStartChat}
          loading={startingChat}
        />
      )}
    </div>
  )
}

const s = {
  shell: {
    height: '100vh', display: 'flex', flexDirection: 'column',
    backgroundColor: 'var(--color-bg)', overflow: 'hidden',
  },
  body: { flex: 1, display: 'flex', overflow: 'hidden' },
  main: {
    flex: 1, display: 'flex', flexDirection: 'column',
    overflow: 'hidden', backgroundColor: 'var(--color-bg)',
  },
  topBar: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '0 16px', height: 59, minHeight: 59,
    backgroundColor: 'var(--color-header-bg)',
    borderBottom: '1px solid var(--color-border)',
    flexShrink: 0,
  },
  backBtn: {
    background: 'none', border: 'none', color: 'var(--color-primary)',
    cursor: 'pointer', width: 34, height: 34, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  topBarTitle: { fontSize: 16, fontWeight: 600, color: 'var(--color-text)', flex: 1 },
  searchingPill: {
    fontSize: 11, color: 'var(--color-text-dim)',
    backgroundColor: 'var(--color-surface-2)',
    padding: '3px 10px', borderRadius: 20,
  },
  searchWrap: {
    padding: '10px 16px',
    backgroundColor: 'var(--color-surface)',
    borderBottom: '1px solid var(--color-border)',
    flexShrink: 0,
  },
  searchBox: {
    display: 'flex', alignItems: 'center', gap: 8,
    backgroundColor: 'var(--color-search-bg)',
    borderRadius: 10, padding: '9px 12px',
  },
  searchIcon: { color: 'var(--color-text-dim)', flexShrink: 0 },
  searchInput: {
    flex: 1, background: 'transparent', border: 'none', outline: 'none',
    color: 'var(--color-text)', fontSize: 14,
  },
  clearBtn: {
    background: 'none', border: 'none', color: 'var(--color-text-dim)',
    cursor: 'pointer', fontSize: 13, padding: '2px 4px', lineHeight: 1,
  },
  list: { flex: 1, overflowY: 'auto' },
  center: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: 40, marginTop: 40, gap: 6,
  },
  emptyIcon: { fontSize: 40, opacity: 0.4, margin: 0 },
  emptyText: { fontSize: 15, fontWeight: 600, color: 'var(--color-text)', margin: 0 },
  hint: { fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', margin: 0 },
  spinner: {
    width: 24, height: 24,
    border: '2px solid var(--color-border)',
    borderTopColor: 'var(--color-primary)',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    marginBottom: 8,
  },
}

export default FindPeople