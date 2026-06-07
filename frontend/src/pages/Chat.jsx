import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChat } from '../hooks/useChat'
import { useAuth } from '../hooks/useAuth'
import { useChatStore } from '../store/chatStore'
import { useRooms } from '../hooks/useRooms'
import * as userService from '../services/userService'
import * as roomService from '../services/roomService'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import ChatBox from '../components/ChatBox'
import MessageInput from '../components/MessageInput'
import MessageRequestBanner from '../components/MessageRequestBanner'
import '../styles/chat.css'

function Chat() {
  const { roomId }   = useParams()
  const navigate     = useNavigate()
  const { messages, typingUsers, sendMessage, editMessage, deleteMessage } = useChat(roomId)
  const { currentUser } = useAuth()
  const rooms        = useChatStore(state => state.rooms)
  const pendingRooms = useChatStore(state => state.pendingRooms)
  const onlineUsers  = useChatStore(state => state.onlineUsers)

  // ── Search state ──────────────────────────────────────────────
  const [searchOpen,  setSearchOpen]  = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [matchIndex,  setMatchIndex]  = useState(0)
  const searchInputRef = useRef(null)

  // ── Block status ──────────────────────────────────────────────
  const [blockStatus, setBlockStatus] = useState({
    iBlockedThem: false,
    theyBlockedMe: false,
    loaded: false
  })

  // ── Room loading state — prevents "Chat" flash while fetching ─
  const [roomLoading, setRoomLoading] = useState(false)

  // ── Fallback room fetched directly from the API when the store
  //    doesn't have this room yet (e.g. page refresh / direct URL).
  const [fetchedRoom, setFetchedRoom] = useState(null)

  useRooms()

  // ── Resolve room: prefer store, fall back to fetchedRoom ─────
  const pendingRoom  = pendingRooms.find(r => r.id === roomId || r._id === roomId)
  const acceptedRoom = rooms.find(r => r.id === roomId || r._id === roomId)
  const room         = pendingRoom || acceptedRoom || fetchedRoom

  // ── FIX BUG 1: isPending must distinguish sender vs receiver.
  //
  //    The RECEIVER's pending rooms live in `pendingRooms` (populated
  //    by useRooms → getRequests, which filters requestedBy !== me).
  //    The SENDER's newly-created room lives in `rooms` with status:'pending'
  //    (added optimistically by FindPeople.handleStartChat).
  //
  //    Old logic: isPending = !!pendingRoom || room?.status === 'pending'
  //    Bug: the second condition fires for the SENDER too.
  //
  //    Fix: also check requestedBy. If current user IS requestedBy, they are
  //    the sender — show a normal (non-pending) chat view for them.
  const currentUserId    = currentUser?.id?.toString() || currentUser?._id?.toString() || ''
  const requestedById    = (room?.requestedBy?._id || room?.requestedBy?.id || room?.requestedBy)?.toString() || ''
  const iAmRequester     = !!requestedById && requestedById === currentUserId
  // A room is "pending for me" only if I'm in the pendingRooms list (= I am the receiver)
  // OR the room status is pending AND I'm NOT the one who sent the request.
  const isPending        = !!pendingRoom || (room?.status === 'pending' && !iAmRequester)

  // ── Track which roomId we last fetched to avoid re-fetch loops ─
  const lastFetchedRoomId = useRef(null)

  useEffect(() => {
    // Reset fetch tracker when navigating to a different room
    if (lastFetchedRoomId.current !== roomId) {
      lastFetchedRoomId.current = null
      setFetchedRoom(null)
    }
  }, [roomId])

  useEffect(() => {
    // If we already have a fully-populated room in the store, nothing to do.
    const storeRoom = pendingRooms.find(r => r.id === roomId || r._id === roomId)
                   || rooms.find(r => r.id === roomId || r._id === roomId)

    if (storeRoom?.otherUser?.name) {
      setFetchedRoom(null)
      lastFetchedRoomId.current = null
      return
    }

    // Avoid re-fetching the same roomId
    if (lastFetchedRoomId.current === roomId) return
    lastFetchedRoomId.current = roomId

    let cancelled = false
    setRoomLoading(true)

    roomService.getRoomById(roomId)
      .then(res => {
        if (cancelled) return
        const r = res.data.room
        if (!r) return

        const currentUid = currentUser?.id?.toString() || currentUser?._id?.toString()

        const normalizedParticipants = (r.participantIds || []).map(p =>
          typeof p === 'object'
            ? { ...p, id: (p._id || p.id)?.toString(), _id: (p._id || p.id)?.toString() }
            : { id: p?.toString(), _id: p?.toString() }
        )

        const otherParticipant = normalizedParticipants.find(p => p.id !== currentUid)

        const otherUser = otherParticipant
          ? {
              id:       otherParticipant.id,
              _id:      otherParticipant._id,
              name:     otherParticipant.name   || null,
              avatar:   otherParticipant.avatar || null,
              email:    otherParticipant.email  || null,
              isOnline: otherParticipant.isOnline ?? false,
            }
          : null

        // FIX BUG 2: preserve requestedBy as a plain string so the
        // isPending / iAmRequester check works after a page refresh.
        const requestedByStr = (r.requestedBy?._id || r.requestedBy?.id || r.requestedBy)?.toString() || null

        const formatted = {
          ...r,
          id:             (r._id || r.id)?.toString(),
          _id:            (r._id || r.id)?.toString(),
          participantIds: normalizedParticipants,
          otherUser,
          // Keep requestedBy as a plain string for the isPending guard
          requestedBy:    requestedByStr,
          lastMessage: r.lastMessage
            ? {
                content:    r.lastMessage.content   || '',
                timestamp:  r.lastMessage.createdAt || r.lastMessage.timestamp,
                senderName: r.lastMessage.senderId?.name || '',
              }
            : null,
        }

        // Push into the store so subsequent renders hit the fast path
        useChatStore.getState().addRoom(formatted)
        setFetchedRoom(formatted)
      })
      .catch(() => { /* room may not exist */ })
      .finally(() => { if (!cancelled) setRoomLoading(false) })

    return () => { cancelled = true }
  // Only re-run when roomId or currentUser changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, currentUser?.id])

  // ── otherUser & otherUserId ───────────────────────────────────
  const otherUser = room?.otherUser

  const otherUserId = (() => {
    if (otherUser?.id || otherUser?._id) {
      return (otherUser.id || otherUser._id)?.toString()
    }
    const participant = room?.participantIds?.find(p => {
      const pid = (p?.id || p?._id || p)?.toString()
      return pid && pid !== currentUserId
    })
    return (participant?.id || participant?._id || participant)?.toString() ?? null
  })()

  // ── Online status ─────────────────────────────────────────────
  const isOnlineFromServer = otherUser?.isOnline === true
  const isOnlineFromStore  = !!otherUserId && onlineUsers.includes(otherUserId)
  const isOnline           = isOnlineFromServer || isOnlineFromStore

  // ── Block status fetch ────────────────────────────────────────
  const fetchBlockStatus = useCallback(async () => {
    if (!otherUserId || room?.isGroup) {
      setBlockStatus({ iBlockedThem: false, theyBlockedMe: false, loaded: true })
      return
    }
    try {
      const res  = await userService.getUserById(otherUserId)
      const user = res.data.user
      setBlockStatus({
        iBlockedThem:  !!user.isBlocked,
        theyBlockedMe: !!user.hasBlockedMe,
        loaded: true
      })
    } catch {
      setBlockStatus({ iBlockedThem: false, theyBlockedMe: false, loaded: true })
    }
  }, [otherUserId, room?.isGroup])

  useEffect(() => {
    setBlockStatus(s => ({ ...s, loaded: false }))
    fetchBlockStatus()
  }, [fetchBlockStatus])

  useEffect(() => {
    window.addEventListener('focus', fetchBlockStatus)
    return () => window.removeEventListener('focus', fetchBlockStatus)
  }, [fetchBlockStatus])

  // ── Search helpers ────────────────────────────────────────────
  const matchingIndices = useCallback(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    return messages.reduce((acc, msg, i) => {
      if (msg.type === 'text' && msg.content?.toLowerCase().includes(q)) acc.push(i)
      return acc
    }, [])
  }, [searchQuery, messages])

  const matches    = matchingIndices()
  const matchCount = matches.length

  useEffect(() => { setMatchIndex(0) }, [searchQuery, roomId])

  const openSearch = useCallback(() => {
    setSearchOpen(true)
    setTimeout(() => searchInputRef.current?.focus(), 50)
  }, [])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setSearchQuery('')
    setMatchIndex(0)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        searchOpen ? closeSearch() : openSearch()
      }
      if (e.key === 'Escape' && searchOpen) closeSearch()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [searchOpen, openSearch, closeSearch])

  const goNext = () => { if (matchCount) setMatchIndex(i => (i + 1) % matchCount) }
  const goPrev = () => { if (matchCount) setMatchIndex(i => (i - 1 + matchCount) % matchCount) }

  // ── Display helpers ───────────────────────────────────────────
  const getDisplayName = () => {
    if (room?.isGroup) return room.groupName || 'Group'
    if (room?.otherUser?.name) return room.otherUser.name
    const other = room?.participantIds?.find(p => {
      const pid = (p?.id || p?._id || p)?.toString()
      return pid && pid !== currentUserId
    })
    return other?.name || other?.email || (roomLoading ? '' : 'Chat')
  }

  const displayName = getDisplayName()
  // While loading, show neutral initials instead of "?" for "Chat"
  const initials    = displayName ? displayName.slice(0, 2).toUpperCase() : '…'
  // Only show senderName banner for the RECEIVER (isPending is already false for sender)
  const senderName  = isPending ? (room?.otherUser?.name || 'Someone') : null

  const handleHeaderClick = () => {
    if (room?.isGroup) return
    const uid = (otherUser?.id || otherUser?._id)?.toString() || otherUserId
    if (uid) navigate(`/user/${uid}`)
  }

  const isBlocked     = blockStatus.iBlockedThem || blockStatus.theyBlockedMe
  const blockedByThem = blockStatus.theyBlockedMe && !blockStatus.iBlockedThem
  const activeMatchMsgIndex = matchCount > 0 ? matches[matchIndex] : -1

  return (
    <div style={styles.shell}>
      <Navbar />
      <div style={styles.body}>
        <Sidebar />
        <div style={styles.main}>

          {/* ── Header ── */}
          <div className='chat-header' onClick={handleHeaderClick}>
            <div className='chat-header-avatar-wrap'>
              <div className='chat-header-avatar' style={{
                background: '#5b8def', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15,
              }}>
                {roomLoading && !displayName ? (
                  // Subtle pulse while loading — avoids "Chat" flash
                  <span style={{ opacity: 0.4, fontSize: 18 }}>…</span>
                ) : initials}
              </div>
              {isOnline && <span className='chat-header-online-dot' />}
            </div>

            <div className='chat-header-info'>
              {roomLoading && !displayName ? (
                // Skeleton placeholders — no "Chat" / "?" flicker
                <>
                  <span style={styles.skeletonName} />
                  <span style={styles.skeletonStatus} />
                </>
              ) : (
                <>
                  <span className='chat-header-name'>{displayName || '…'}</span>
                  <span className={`chat-header-status ${isOnline ? '' : 'offline'}`}>
                    {isPending ? 'Message Request' : isOnline ? 'Online' : 'Offline'}
                  </span>
                </>
              )}
            </div>

            <div className='chat-header-actions'>
              <button
                className='chat-header-icon'
                title='Search in chat (Ctrl+F)'
                onClick={e => { e.stopPropagation(); openSearch() }}
              >
                🔍
              </button>
              <button className='chat-header-icon' title='More'
                onClick={e => e.stopPropagation()}>⋮</button>
            </div>
          </div>

          {/* ── Search Bar ── */}
          {searchOpen && (
            <div className='chat-search-bar'>
              <div className='chat-search-pill'>
                <svg width='15' height='15' viewBox='0 0 24 24' fill='none'
                  stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'
                  style={{ color: 'var(--color-text-dim)', flexShrink: 0 }}>
                  <circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/>
                </svg>
                <input
                  ref={searchInputRef}
                  id='chat-search-input'
                  name='chat-search'
                  type='text'
                  placeholder='Search messages…'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') e.shiftKey ? goPrev() : goNext()
                    if (e.key === 'Escape') closeSearch()
                  }}
                  autoComplete='off'
                  spellCheck={false}
                />
                {searchQuery && (
                  <span className='chat-search-count'>
                    {matchCount === 0 ? 'No results' : `${matchIndex + 1} / ${matchCount}`}
                  </span>
                )}
              </div>
              <button className='chat-search-nav-btn' onClick={goPrev} disabled={matchCount < 2} title='Previous (Shift+Enter)'>
                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='18 15 12 9 6 15'/></svg>
              </button>
              <button className='chat-search-nav-btn' onClick={goNext} disabled={matchCount < 2} title='Next (Enter)'>
                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='6 9 12 15 18 9'/></svg>
              </button>
              <button className='chat-search-close-btn' onClick={closeSearch} title='Close (Esc)'>
                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg>
              </button>
            </div>
          )}

          {/* ── Pending request banner (RECEIVER only) ── */}
          {isPending && senderName && (
            <MessageRequestBanner
              roomId={roomId}
              senderName={senderName}
              onAccepted={() => {}}
              onRejected={() => navigate('/')}
            />
          )}

          {/* ── Messages ── */}
          <ChatBox
            messages={messages}
            typingUsers={typingUsers}
            currentUserId={currentUser?.id}
            searchQuery={searchQuery.trim()}
            activeMatchMsgIndex={activeMatchMsgIndex}
            onEditMessage={editMessage}
            onDeleteMessage={deleteMessage}
          />

          {/* ── Input / blocked / pending banners ── */}
          {isPending ? (
            <div style={styles.blockedInput}>
              <p>Accept the request to send messages.</p>
            </div>
          ) : blockedByThem ? (
            <div style={styles.blockedBanner}>
              <span style={styles.blockedIcon}>🚫</span>
              <div>
                <p style={styles.blockedTitle}>You can't send messages to {displayName}</p>
                <p style={styles.blockedSub}>This user has restricted who can message them.</p>
              </div>
            </div>
          ) : blockStatus.iBlockedThem ? (
            <div style={styles.blockedBanner}>
              <span style={styles.blockedIcon}>🚫</span>
              <div>
                <p style={styles.blockedTitle}>You have blocked {displayName}</p>
                <p style={styles.blockedSub}>
                  Unblock from{' '}
                  <span style={styles.unblockLink} onClick={handleHeaderClick}>Contact Info</span>
                  {' '}to send messages.
                </p>
              </div>
            </div>
          ) : (
            <MessageInput onSend={sendMessage} roomId={roomId} disabled={isBlocked} isGroup={false} />
          )}

        </div>
      </div>
    </div>
  )
}

const styles = {
  shell:        { height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)', overflow: 'hidden' },
  body:         { flex: 1, display: 'flex', overflow: 'hidden' },
  main:         { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' },
  blockedInput: { padding: '14px 16px', backgroundColor: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)', flexShrink: 0 },
  blockedBanner:{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', backgroundColor: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', flexShrink: 0 },
  blockedIcon:  { fontSize: 22, flexShrink: 0 },
  blockedTitle: { fontSize: 13, fontWeight: 600, color: 'var(--color-text)', margin: 0 },
  blockedSub:   { fontSize: 12, color: 'var(--color-text-muted)', margin: '2px 0 0', lineHeight: 1.4 },
  unblockLink:  { color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline', fontWeight: 500 },
  // Loading skeleton styles — prevent "Chat" flash while room data loads
  skeletonName: {
    display: 'block', height: 14, width: 100,
    borderRadius: 6,
    background: 'linear-gradient(90deg, var(--color-surface-2, #2a3942) 25%, var(--color-border, #3a4a57) 50%, var(--color-surface-2, #2a3942) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
    marginBottom: 5,
  },
  skeletonStatus: {
    display: 'block', height: 10, width: 60,
    borderRadius: 4,
    background: 'linear-gradient(90deg, var(--color-surface-2, #2a3942) 25%, var(--color-border, #3a4a57) 50%, var(--color-surface-2, #2a3942) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
    opacity: 0.6,
  },
}

export default Chat