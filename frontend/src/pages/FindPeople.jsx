import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, ArrowLeft, MessageCircle, Users } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useChatStore } from '../store/chatStore'
import { useSocket } from '../hooks/useSocket'
import { useMobileNav } from '../hooks/useMobileNav'
import * as userService from '../services/userService'
import * as roomService from '../services/roomService'
import { SEND_REQUEST } from '../socket/socketEvents'
import { generateAvatar } from '../utils/generateAvatar'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import MobilePageHeader from '../components/MobilePageHeader'
import '../styles/findpeople.css'
import '../styles/mobile-page.css'

// ─── Profile Preview Modal ─────────────────────────────────────────────────────
function ProfilePreview({ user, onClose, onStartChat, loading }) {
  const avatarSrc = user.avatar || generateAvatar(user.name)
  // Privacy: isOnline may be null when online status is hidden
  const showOnline    = user.isOnline === true
  const canMessage    = user.canMessage !== false  // default true if not set
  const statusVisible = user.isOnline !== null && user.isOnline !== undefined

  const handleOverlay = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className='modal-overlay' onClick={handleOverlay}>
      <div className='modal fp-preview-modal'>

        <div className='modal-header'>
          <span className='modal-title'>{user.name}</span>
          <button className='btn btn-ghost btn-icon' onClick={onClose} aria-label='Close'>
            <X size={18} />
          </button>
        </div>

        <div className='modal-body fp-preview-body'>
          <div className='fp-preview-avatar-section'>
            <div className='fp-preview-avatar-wrap'>
              <img src={avatarSrc} alt={user.name} className='fp-preview-avatar' />
              {showOnline && <span className='fp-preview-online-dot' />}
            </div>

            <p className='fp-preview-email'>{user.email}</p>
            {user.bio && <p className='fp-preview-bio'>&ldquo;{user.bio}&rdquo;</p>}

            {statusVisible && (
              <div className='fp-preview-status-row'>
                <span className={`fp-preview-status-pill ${showOnline ? 'online' : 'offline'}`}>
                  <span className='fp-preview-status-dot' />
                  {showOnline ? 'Online now' : 'Offline'}
                </span>
              </div>
            )}
          </div>

          <div className='fp-preview-actions'>
            <button className='btn btn-secondary btn-sm' onClick={onClose}>
              Cancel
            </button>
            {canMessage ? (
              <button
                className='btn btn-primary'
                onClick={() => onStartChat(user)}
                disabled={loading}
                style={{ flex: 2 }}
              >
                {loading ? (
                  <span className='fp-btn-loading'>
                    <span className='fp-btn-spinner' />
                    Starting…
                  </span>
                ) : (
                  <>
                    <MessageCircle size={15} />
                    Start Chat
                  </>
                )}
              </button>
            ) : (
              <button
                className='btn btn-secondary'
                disabled
                style={{ flex: 2, opacity: 0.6, cursor: 'not-allowed' }}
                title='This user does not accept new messages'
              >
                Messages Restricted
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── User Row ──────────────────────────────────────────────────────────────────
function UserRow({ user, query, onPreview }) {
  const avatarSrc = user.avatar || generateAvatar(user.name)
  const showOnline = user.isOnline === true  // null = hidden by privacy

  const highlight = (text, q) => {
    if (!q.trim()) return text
    const idx = text.toLowerCase().indexOf(q.toLowerCase().trim())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark className='fp-highlight'>
          {text.slice(idx, idx + q.trim().length)}
        </mark>
        {text.slice(idx + q.trim().length)}
      </>
    )
  }

  return (
    <div className='fp-user-row' onClick={() => onPreview(user)}>
      <div className='fp-row-avatar-wrap'>
        <img src={avatarSrc} alt={user.name} className='fp-row-avatar' />
        {showOnline && <span className='fp-row-online-dot' />}
      </div>
      <div className='fp-row-info'>
        <p className='fp-row-name'>{highlight(user.name, query)}</p>
        <p className='fp-row-email'>{highlight(user.email, query)}</p>
        {user.bio && <p className='fp-row-bio'>{user.bio}</p>}
      </div>
      <span className={`fp-row-status-tag ${showOnline ? 'online' : user.isOnline === null ? 'hidden' : 'offline'}`}>
        {showOnline ? '● Online' : user.isOnline === null ? '' : '○ Offline'}
      </span>
    </div>
  )
}

// ─── Section Label ─────────────────────────────────────────────────────────────
function SectionLabel({ label, count }) {
  return (
    <div className='fp-section-label'>
      <span className='fp-section-label-text'>{label}</span>
      <span className='fp-section-label-count'>{count}</span>
    </div>
  )
}

// ─── Skeleton loader rows ──────────────────────────────────────────────────────
function SkeletonRows() {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <div key={i} className='fp-skeleton-row'>
          <span className='fp-skeleton-avatar skeleton' />
          <div className='fp-skeleton-info'>
            <span className='fp-skeleton-name skeleton' />
            <span className='fp-skeleton-email skeleton' />
          </div>
        </div>
      ))}
    </>
  )
}

// ─── Shared inner content (used by both mobile and desktop) ───────────────────
function FindPeopleContent({
  query, setQuery,
  loadingAll, searching,
  displayList, isFiltering,
  onlineUsers, offlineUsers,
  previewUser, setPreviewUser,
  startingChat, handleStartChat,
}) {
  const searchInputRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => searchInputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      {/* ── Search input ── */}
      <div className='fp-search-wrap'>
        <div className='fp-search-box'>
          <Search size={16} className='fp-search-icon' />
          <input
            ref={searchInputRef}
            id='find-people-search'
            name='find-people-search'
            className='fp-search-input'
            type='text'
            placeholder='Search by name or email…'
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete='off'
            spellCheck={false}
          />
          {query && (
            <button
              className='fp-search-clear'
              onClick={() => setQuery('')}
              title='Clear'
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── User list ── */}
      <div className='fp-list'>

        {loadingAll && !isFiltering && <SkeletonRows />}

        {!loadingAll && isFiltering && (
          <>
            {displayList.length > 0 && (
              <SectionLabel label={`Results for "${query}"`} count={displayList.length} />
            )}
            {displayList.map(user => (
              <UserRow key={user.id} user={user} query={query} onPreview={setPreviewUser} />
            ))}
            {displayList.length === 0 && !searching && (
              <div className='fp-empty'>
                <Search size={40} className='fp-empty-icon' />
                <p className='fp-empty-text'>No results for &ldquo;{query}&rdquo;</p>
                <p className='fp-empty-hint'>Try a different name or email</p>
              </div>
            )}
          </>
        )}

        {!loadingAll && !isFiltering && (
          <>
            {onlineUsers.length === 0 && offlineUsers.length === 0 && (
              <div className='fp-empty'>
                <Users size={40} className='fp-empty-icon' />
                <p className='fp-empty-text'>No other users yet</p>
                <p className='fp-empty-hint'>Invite friends to join!</p>
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

      {/* ── Profile Preview Modal ── */}
      {previewUser && (
        <ProfilePreview
          user={previewUser}
          onClose={() => setPreviewUser(null)}
          onStartChat={handleStartChat}
          loading={startingChat}
        />
      )}
    </>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
function FindPeople() {
  const [allUsers,       setAllUsers]       = useState([])
  const [query,          setQuery]          = useState('')
  const [loadingAll,     setLoadingAll]     = useState(true)
  const [searching,      setSearching]      = useState(false)
  const [searchResults,  setSearchResults]  = useState(null)
  const [previewUser,    setPreviewUser]    = useState(null)
  const [startingChat,   setStartingChat]   = useState(false)

  const navigate        = useNavigate()
  const { currentUser } = useAuth()
  const { emit }        = useSocket()
  const rooms           = useChatStore(state => state.rooms)
  const debounceRef     = useRef(null)
  const { isMobile }    = useMobileNav()

  // ── Load all users on mount ─────────────────────────────────────────────────
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

    const q = query.toLowerCase().trim()
    const clientFiltered = allUsers.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    )
    setSearchResults(clientFiltered)

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

  // ── Start chat ──────────────────────────────────────────────────────────────
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

      const otherUser = {
        id:     (user.id || user._id)?.toString(),
        _id:    (user.id || user._id)?.toString(),
        name:   user.name,
        avatar: user.avatar || null,
        email:  user.email,
      }

      const participantObjects = (room.participantIds || []).map(p => {
        if (typeof p === 'object') {
          return { ...p, id: (p._id || p.id)?.toString(), _id: (p._id || p.id)?.toString() }
        }
        const pid = p?.toString()
        if (pid === otherUser.id) return { ...otherUser }
        return { id: pid, _id: pid, name: currentUser?.name, avatar: currentUser?.avatar }
      })

      const formattedRoom = {
        id:             roomId,
        _id:            roomId,
        participantIds: participantObjects,
        isGroup:        false,
        groupName:      null,
        avatarUrl:      null,
        status:         room.status || 'pending',
        requestedBy:    currentUser?.id?.toString() || currentUser?._id?.toString(),
        lastMessage:    null,
        otherUser,
      }

      useChatStore.getState().addRoom(formattedRoom)

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

  const sharedProps = {
    query, setQuery,
    loadingAll, searching,
    displayList, isFiltering,
    onlineUsers, offlineUsers,
    previewUser, setPreviewUser,
    startingChat, handleStartChat,
  }

  // ── MOBILE: full-screen page ────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className='mph-shell'>
        <MobilePageHeader
          title='New Chat'
          fallbackPath='/'
          trailing={
            searching
              ? <span className='mph-status-pill'>searching…</span>
              : null
          }
        />
        <div className='mph-content'>
          <FindPeopleContent {...sharedProps} />
        </div>
      </div>
    )
  }

  // ── DESKTOP / TABLET: original layout unchanged ─────────────────────────────
  return (
    <div className='fp-shell'>
      <Navbar />
      <div className='fp-body'>
        <Sidebar />

        <div className='fp-main'>
          <div className='fp-topbar'>
            <button
              className='btn btn-ghost btn-icon fp-back-btn'
              onClick={() => navigate(-1)}
              title='Back'
            >
              <ArrowLeft size={20} />
            </button>
            <span className='fp-topbar-title'>New Chat</span>
            {searching && (
              <span className='fp-searching-pill'>searching…</span>
            )}
          </div>

          <FindPeopleContent {...sharedProps} />
        </div>
      </div>
    </div>
  )
}

export default FindPeople