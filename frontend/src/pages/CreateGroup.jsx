import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useChatStore } from '../store/chatStore'
import { generateAvatar } from '../utils/generateAvatar'
import * as userService from '../services/userService'
import * as groupService from '../services/groupService'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'

// ─── Debounce helper ─────────────────────────────────────────────────────────
function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CreateGroup() {
  const navigate     = useNavigate()
  const { currentUser } = useAuth()
  const addRoom      = useChatStore(state => state.setRooms)
  const existingRooms = useChatStore(state => state.rooms)

  // Form fields
  const [groupName,    setGroupName]    = useState('')
  const [description,  setDescription]  = useState('')
  const [avatarFile,   setAvatarFile]   = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)

  // Member search
  const [searchQuery,  setSearchQuery]  = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching,    setSearching]    = useState(false)
  const [selectedUsers, setSelectedUsers] = useState([])

  // Submission
  const [creating,   setCreating]   = useState(false)
  const [error,      setError]      = useState('')

  const avatarInputRef = useRef(null)
  const debouncedQuery = useDebounce(searchQuery)

  // ── Search users ──────────────────────────────────────────────────────────
  useEffect(() => {
    const q = debouncedQuery.trim()
    if (!q) { setSearchResults([]); return }

    setSearching(true)
    userService.searchUsers(q)
      .then(res => {
        const users = (res.data.users || res.data || []).filter(
          u => u._id !== currentUser?.id && u.id !== currentUser?.id
        )
        setSearchResults(users)
      })
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false))
  }, [debouncedQuery, currentUser])

  // ── Avatar pick ───────────────────────────────────────────────────────────
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  // ── Toggle member selection ───────────────────────────────────────────────
  const toggleUser = useCallback((user) => {
    setSelectedUsers(prev => {
      const id = user._id || user.id
      const exists = prev.some(u => (u._id || u.id) === id)
      if (exists) return prev.filter(u => (u._id || u.id) !== id)
      return [...prev, user]
    })
  }, [])

  const removeSelected = (userId) => {
    setSelectedUsers(prev => prev.filter(u => (u._id || u.id) !== userId))
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setError('')
    if (!groupName.trim()) return setError('Group name is required.')

    setCreating(true)
    try {
      // Create group with just the admin — members get invitations, not auto-added
      const res = await groupService.createGroup({
        groupName:   groupName.trim(),
        description: description.trim(),
        memberIds:   [],   // only creator is added
        avatar:      avatarFile,
      })
      const newRoom = res.data.room
      const normalised = {
        ...newRoom,
        id:             newRoom._id || newRoom.id,
        participantIds: (newRoom.participantIds || []).map(p =>
          typeof p === 'object' ? { ...p, id: p._id || p.id } : p
        ),
        lastMessage: null,
      }
      addRoom([normalised, ...existingRooms])

      // Send invitations to selected users (they must accept before joining)
      if (selectedUsers.length > 0) {
        const userIds = selectedUsers.map(u => u._id || u.id)
        await groupService.inviteUsers(normalised.id, userIds)
      }

      navigate(`/group/${normalised.id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const groupAvatarSrc  = avatarPreview || generateAvatar(groupName || 'Group')
  const canCreate       = groupName.trim().length > 0

  return (
    <div style={s.shell}>
      <Navbar />
      <div style={s.body}>
        <Sidebar />

        <main style={s.main}>
          <div style={s.card}>

            {/* ── Header ── */}
            <div style={s.header}>
              <button style={s.backBtn} onClick={() => navigate(-1)} title='Back'>
                ←
              </button>
              <h1 style={s.title}>New Group</h1>
            </div>

            {/* ── Avatar + name row ── */}
            <div style={s.avatarRow}>
              <div style={s.avatarWrap} onClick={() => avatarInputRef.current?.click()} title='Change photo'>
                <img src={groupAvatarSrc} alt='Group' style={s.avatarImg} />
                <div style={s.avatarOverlay}>
                  <span style={s.cameraIcon}>📷</span>
                </div>
                <input
                  ref={avatarInputRef}
                  type='file'
                  accept='image/*'
                  style={{ display: 'none' }}
                  onChange={handleAvatarChange}
                />
              </div>

              <div style={s.nameCol}>
                <label style={s.label}>Group Name *</label>
                <input
                  style={s.input}
                  placeholder='Enter group name…'
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  maxLength={60}
                  autoFocus
                />
                <span style={s.charCount}>{groupName.length}/60</span>
              </div>
            </div>

            {/* ── Description ── */}
            <div style={s.field}>
              <label style={s.label}>Description <span style={s.optional}>(optional)</span></label>
              <textarea
                style={s.textarea}
                placeholder='What is this group about?'
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={200}
                rows={2}
              />
              <span style={{ ...s.charCount, textAlign: 'right', display: 'block' }}>
                {description.length}/200
              </span>
            </div>

            {/* ── Selected members chips ── */}
            {selectedUsers.length > 0 && (
              <div style={s.chipsWrap}>
                <span style={s.chipsLabel}>Members ({selectedUsers.length})</span>
                <div style={s.chips}>
                  {selectedUsers.map(u => {
                    const uid = u._id || u.id
                    const src = u.avatar || generateAvatar(u.name || 'U')
                    return (
                      <div key={uid} style={s.chip}>
                        <img src={src} alt={u.name} style={s.chipAvatar} />
                        <span style={s.chipName}>{u.name}</span>
                        <button style={s.chipRemove} onClick={() => removeSelected(uid)} title='Remove'>✕</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Search ── */}
            <div style={s.field}>
              <label style={s.label}>Add Members *</label>
              <div style={s.searchWrap}>
                <span style={s.searchIcon}>🔍</span>
                <input
                  style={s.searchInput}
                  placeholder='Search by name or email…'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoComplete='off'
                />
                {searchQuery && (
                  <button style={s.clearBtn} onClick={() => setSearchQuery('')}>✕</button>
                )}
              </div>
            </div>

            {/* ── Search results ── */}
            {searching && (
              <div style={s.hint}>Searching…</div>
            )}

            {!searching && searchQuery.trim() && searchResults.length === 0 && (
              <div style={s.hint}>No users found for "{searchQuery}"</div>
            )}

            {searchResults.length > 0 && (
              <div style={s.resultsList}>
                {searchResults.map(u => {
                  const uid      = u._id || u.id
                  const src      = u.avatar || generateAvatar(u.name || 'U')
                  const selected = selectedUsers.some(s => (s._id || s.id) === uid)
                  return (
                    <div
                      key={uid}
                      style={{ ...s.resultRow, ...(selected ? s.resultRowSelected : {}) }}
                      onClick={() => toggleUser(u)}
                    >
                      <div style={s.resultAvatarWrap}>
                        <img src={src} alt={u.name} style={s.resultAvatar} />
                        {u.isOnline && <span style={s.onlineDot} />}
                      </div>
                      <div style={s.resultInfo}>
                        <span style={s.resultName}>{u.name}</span>
                        <span style={s.resultEmail}>{u.email}</span>
                      </div>
                      <div style={{ ...s.checkbox, ...(selected ? s.checkboxChecked : {}) }}>
                        {selected && <span style={s.checkmark}>✓</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Error ── */}
            {error && <p style={s.error}>{error}</p>}

            {/* ── Create button ── */}
            <button
              style={{ ...s.createBtn, ...((!canCreate || creating) ? s.createBtnDisabled : {}) }}
              onClick={handleCreate}
              disabled={!canCreate || creating}
            >
              {creating ? (
                <span style={s.spinnerRow}><Spinner /> Creating group…</span>
              ) : (
                <>👥 Create Group{selectedUsers.length > 0 ? ` & Invite ${selectedUsers.length}` : ''}</>
              )}
            </button>

          </div>
        </main>
      </div>
    </div>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='none'
      stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'
      style={{ animation: 'cg-spin 0.8s linear infinite', flexShrink: 0 }}>
      <path d='M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83'/>
    </svg>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  shell: {
    display: 'flex', flexDirection: 'column',
    height: '100vh', overflow: 'hidden',
    backgroundColor: 'var(--color-bg)',
    fontFamily: 'inherit',
  },
  body: {
    display: 'flex', flex: 1, overflow: 'hidden',
  },
  main: {
    flex: 1, overflowY: 'auto',
    display: 'flex', justifyContent: 'center',
    padding: '32px 16px',
    backgroundColor: 'var(--color-surface-3)',
  },
  card: {
    width: '100%', maxWidth: 520,
    backgroundColor: 'var(--color-surface)',
    borderRadius: 14,
    padding: '28px 28px 32px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
    display: 'flex', flexDirection: 'column', gap: 20,
    height: 'fit-content',
  },

  // Header
  header: {
    display: 'flex', alignItems: 'center', gap: 12,
  },
  backBtn: {
    background: 'none', border: 'none',
    color: 'var(--color-primary)',
    fontSize: 20, cursor: 'pointer',
    padding: '4px 8px', borderRadius: 8,
    lineHeight: 1,
  },
  title: {
    fontSize: 18, fontWeight: 700,
    color: 'var(--color-text)',
  },

  // Avatar row
  avatarRow: {
    display: 'flex', alignItems: 'flex-start', gap: 20,
  },
  avatarWrap: {
    position: 'relative', flexShrink: 0,
    width: 80, height: 80,
    borderRadius: '50%', cursor: 'pointer',
    overflow: 'hidden',
    border: '2px solid var(--color-primary)',
  },
  avatarImg: {
    width: '100%', height: '100%', objectFit: 'cover',
  },
  avatarOverlay: {
    position: 'absolute', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.15s',
    // Shown on hover via CSS we'll inline below
  },
  cameraIcon: { fontSize: 22 },

  nameCol: {
    flex: 1, display: 'flex', flexDirection: 'column', gap: 4,
  },

  // Fields
  field: {
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  label: {
    fontSize: 12, fontWeight: 600,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  optional: {
    fontWeight: 400, textTransform: 'none', letterSpacing: 0,
    color: 'var(--color-text-dim)',
  },
  input: {
    backgroundColor: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    color: 'var(--color-text)',
    fontSize: 14, padding: '10px 12px',
    outline: 'none', width: '100%',
  },
  textarea: {
    backgroundColor: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    color: 'var(--color-text)',
    fontSize: 14, padding: '10px 12px',
    outline: 'none', width: '100%',
    resize: 'none', fontFamily: 'inherit', lineHeight: 1.5,
  },
  charCount: {
    fontSize: 11, color: 'var(--color-text-dim)',
    alignSelf: 'flex-end',
  },

  // Chips
  chipsWrap: {
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  chipsLabel: {
    fontSize: 12, fontWeight: 600,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  chips: {
    display: 'flex', flexWrap: 'wrap', gap: 8,
  },
  chip: {
    display: 'flex', alignItems: 'center', gap: 6,
    backgroundColor: 'var(--color-primary-light)',
    border: '1px solid var(--color-primary)',
    borderRadius: 20,
    padding: '4px 10px 4px 6px',
  },
  chipAvatar: {
    width: 22, height: 22, borderRadius: '50%', objectFit: 'cover',
  },
  chipName: {
    fontSize: 13, color: 'var(--color-primary)',
    fontWeight: 500,
  },
  chipRemove: {
    background: 'none', border: 'none',
    color: 'var(--color-primary)',
    fontSize: 11, cursor: 'pointer',
    padding: 0, lineHeight: 1,
    opacity: 0.7,
  },

  // Search
  searchWrap: {
    display: 'flex', alignItems: 'center',
    backgroundColor: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 8, overflow: 'hidden',
    gap: 6, padding: '0 10px',
  },
  searchIcon: { fontSize: 14, opacity: 0.6 },
  searchInput: {
    flex: 1, background: 'none', border: 'none',
    color: 'var(--color-text)',
    fontSize: 14, padding: '10px 4px',
    outline: 'none',
  },
  clearBtn: {
    background: 'none', border: 'none',
    color: 'var(--color-text-dim)',
    cursor: 'pointer', fontSize: 13, padding: '0 2px',
  },

  // Results
  resultsList: {
    display: 'flex', flexDirection: 'column', gap: 2,
    maxHeight: 260, overflowY: 'auto',
    borderRadius: 8,
    border: '1px solid var(--color-border)',
  },
  resultRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 12px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    transition: 'background 0.12s',
  },
  resultRowSelected: {
    backgroundColor: 'var(--color-primary-light)',
  },
  resultAvatarWrap: { position: 'relative', flexShrink: 0 },
  resultAvatar: {
    width: 40, height: 40, borderRadius: '50%', objectFit: 'cover',
  },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 10, height: 10, borderRadius: '50%',
    backgroundColor: 'var(--color-online)',
    border: '2px solid var(--color-surface)',
  },
  resultInfo: {
    flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2,
  },
  resultName: {
    fontSize: 14, fontWeight: 600, color: 'var(--color-text)',
  },
  resultEmail: {
    fontSize: 12, color: 'var(--color-text-dim)',
  },
  checkbox: {
    width: 22, height: 22, borderRadius: '50%',
    border: '2px solid var(--color-border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'all 0.12s',
  },
  checkboxChecked: {
    backgroundColor: 'var(--color-primary)',
    borderColor: 'var(--color-primary)',
  },
  checkmark: {
    color: '#fff', fontSize: 12, fontWeight: 700, lineHeight: 1,
  },

  hint: {
    fontSize: 13, color: 'var(--color-text-dim)',
    textAlign: 'center', padding: '12px 0',
  },

  error: {
    fontSize: 13, color: 'var(--color-error)',
    backgroundColor: 'rgba(241,92,109,0.08)',
    borderRadius: 8, padding: '10px 12px',
  },

  // Create button
  createBtn: {
    width: '100%',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    border: 'none', borderRadius: 10,
    padding: '13px 0',
    fontSize: 15, fontWeight: 700,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    transition: 'background 0.15s, opacity 0.15s',
  },
  createBtnDisabled: {
    opacity: 0.45, cursor: 'not-allowed',
  },
  spinnerRow: {
    display: 'flex', alignItems: 'center', gap: 8,
  },
}

// Inject keyframe for spinner once
if (typeof document !== 'undefined' && !document.getElementById('cg-keyframes')) {
  const style = document.createElement('style')
  style.id = 'cg-keyframes'
  style.textContent = `
    @keyframes cg-spin { to { transform: rotate(360deg); } }
    .cg-avatar-wrap:hover .cg-avatar-overlay { opacity: 1 !important; }
  `
  document.head.appendChild(style)
}