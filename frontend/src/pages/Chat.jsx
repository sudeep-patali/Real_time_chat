import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Search, MoreVertical, Ban, ChevronUp, ChevronDown, X, ArrowLeft, Trash2, ShieldOff, Shield } from 'lucide-react'
import { useChat } from '../hooks/useChat'
import { useAuth } from '../hooks/useAuth'
import { useChatStore } from '../store/chatStore'
import { useRooms } from '../hooks/useRooms'
import { useMobileNav } from '../hooks/useMobileNav'
import { useSocket } from '../hooks/useSocket'
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
  const { isMobile } = useMobileNav()
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

  // ── Reply state ───────────────────────────────────────────────
  const [replyTo, setReplyTo] = useState(null)

  // ── Header "more" menu (clear chat / block) ─────────────────────
  const [showHeaderMenu, setShowHeaderMenu] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const headerMenuRef = useRef(null)

  useEffect(() => {
    if (!showHeaderMenu) return
    const handleClickOutside = (e) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) {
        setShowHeaderMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showHeaderMenu])

  // ── Scroll to original message when reply quote is clicked ───
  const handleScrollToMessage = (messageId) => {
    const el = document.querySelector(`[data-message-id="${messageId}"]`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('message-highlight')
    setTimeout(() => el.classList.remove('message-highlight'), 2100)
  }

  // ── Block status ──────────────────────────────────────────────
  const [blockStatus, setBlockStatus] = useState({
    iBlockedThem: false,
    theyBlockedMe: false,
    loaded: false
  })

  // ── Other user's privacy settings (for read-receipt tick display) ──
  const [otherUserPrivacy, setOtherUserPrivacy] = useState(null)
  const { on, off } = useSocket()

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
  const currentUserId    = currentUser?.id?.toString() || currentUser?._id?.toString() || ''
  const requestedById    = (room?.requestedBy?._id || room?.requestedBy?.id || room?.requestedBy)?.toString() || ''
  const iAmRequester     = !!requestedById && requestedById === currentUserId
  const isPending        = !!pendingRoom || (room?.status === 'pending' && !iAmRequester)

  // ── Track which roomId we last fetched to avoid re-fetch loops ─
  const lastFetchedRoomId = useRef(null)

  useEffect(() => {
    if (lastFetchedRoomId.current !== roomId) {
      lastFetchedRoomId.current = null
      setFetchedRoom(null)
    }
  }, [roomId])

  useEffect(() => {
    const storeRoom = pendingRooms.find(r => r.id === roomId || r._id === roomId)
                   || rooms.find(r => r.id === roomId || r._id === roomId)

    if (storeRoom?.otherUser?.name) {
      setFetchedRoom(null)
      lastFetchedRoomId.current = null
      return
    }

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

        // FIX BUG 2: preserve requestedBy as a plain string
        const requestedByStr = (r.requestedBy?._id || r.requestedBy?.id || r.requestedBy)?.toString() || null

        const formatted = {
          ...r,
          id:             (r._id || r.id)?.toString(),
          _id:            (r._id || r.id)?.toString(),
          participantIds: normalizedParticipants,
          otherUser,
          requestedBy:    requestedByStr,
          lastMessage: r.lastMessage
            ? {
                content:    r.lastMessage.content   || '',
                timestamp:  r.lastMessage.createdAt || r.lastMessage.timestamp,
                senderName: r.lastMessage.senderId?.name || '',
              }
            : null,
        }

        useChatStore.getState().addRoom(formatted)
        setFetchedRoom(formatted)
      })
      .catch(() => { /* room may not exist */ })
      .finally(() => { if (!cancelled) setRoomLoading(false) })

    return () => { cancelled = true }
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
  // Read the live otherUser from the rooms store (updated by updateUserOnline)
  // so the header re-renders the instant a user_online socket event fires.
  // Fall back to the room object for the initial render.
  const liveRoom      = rooms.find(r => r.id === roomId || r._id === roomId)
  const liveOtherUser = liveRoom?.otherUser || otherUser

  // isOnline === null means the other user hid their status (privacy setting)
  const onlineStatusHidden = liveOtherUser?.isOnline === null
  const isOnline = !onlineStatusHidden && (
    onlineUsers.includes(otherUserId) || liveOtherUser?.isOnline === true
  )
  // lastSeen is updated in the room object by updateUserOnline on disconnect
  const displayLastSeen = liveOtherUser?.lastSeen

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
      // Capture their privacy settings so we can render ticks correctly
      if (user.privacy) setOtherUserPrivacy(user.privacy)
    } catch {
      setBlockStatus({ iBlockedThem: false, theyBlockedMe: false, loaded: true })
    }
  }, [otherUserId, room?.isGroup])

  // Keep otherUserPrivacy in sync when they change their privacy settings live
  useEffect(() => {
    if (!otherUserId) return
    const handlePrivacyUpdated = ({ userId, privacy }) => {
      if (userId?.toString() === otherUserId && privacy) {
        setOtherUserPrivacy(prev => ({ ...(prev || {}), ...privacy }))
      }
    }
    on('privacy_updated', handlePrivacyUpdated)
    return () => off('privacy_updated', handlePrivacyUpdated)
  }, [otherUserId, on, off])

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

  const openSearch = () => {
    setSearchOpen(true)
    setTimeout(() => searchInputRef.current?.focus(), 0)
  }

  const closeSearch = () => {
    setSearchOpen(false)
    setSearchQuery('')
    setMatchIndex(0)
  }

  const goNext = () => {
    if (matchCount < 1) return
    setMatchIndex(i => (i + 1) % matchCount)
  }

  const goPrev = () => {
    if (matchCount < 1) return
    setMatchIndex(i => (i - 1 + matchCount) % matchCount)
  }

  const getDisplayName = () => {
    if (room?.isGroup) return room.groupName || 'Group'
    if (room?.otherUser?.name) return room.otherUser.name
    const other = room?.participantIds?.find(p => {
      const pid = (p?.id || p?._id || p)?.toString()
      return pid && pid !== currentUserId
    })
    return other?.name || other?.email || (roomLoading ? '' : 'Chat')
  }

  const displayName  = getDisplayName()
  const initials     = displayName ? displayName.slice(0, 2).toUpperCase() : '…'
  const headerAvatar = room?.isGroup
    ? (room.groupAvatar || room.avatarUrl || null)
    : (room?.otherUser?.avatar || null)
  const senderName   = isPending ? (room?.otherUser?.name || 'Someone') : null

  const handleHeaderClick = () => {
    if (room?.isGroup) return
    const uid = (otherUser?.id || otherUser?._id)?.toString() || otherUserId
    if (uid) navigate(`/user/${uid}`)
  }

  // ── Clear chat ───────────────────────────────────────────────
  const handleClearChat = async () => {
    setShowHeaderMenu(false)
    if (!roomId) return
    if (!window.confirm('Clear this chat? This will delete all messages for you.')) return
    setClearing(true)
    try {
      await roomService.clearChat(roomId)
      useChatStore.getState().setMessages([])
      window.location.reload()
    } catch (err) {
      console.error('Failed to clear chat', err)
    } finally {
      setClearing(false)
    }
  }

  // ── Block / unblock user ───────────────────────────────────────
  const handleToggleBlock = async () => {
    setShowHeaderMenu(false)
    if (!otherUserId) return
    const action = blockStatus.iBlockedThem ? 'unblock' : 'block'
    if (!window.confirm(
      blockStatus.iBlockedThem
        ? `Unblock ${displayName}? They will be able to message you again.`
        : `Block ${displayName}? They will no longer be able to send you messages.`
    )) return
    setBlocking(true)
    try {
      await userService.blockUser(otherUserId)
      setBlockStatus(s => ({ ...s, iBlockedThem: !s.iBlockedThem }))
    } catch (err) {
      console.error(`Failed to ${action} user`, err)
    } finally {
      setBlocking(false)
    }
  }

  // ── Mobile back — return to chat list, preserving browser history ──
  const handleMobileBack = (e) => {
    e.stopPropagation()
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1)
    } else {
      navigate('/', { replace: true })
    }
  }

  const isBlocked     = blockStatus.iBlockedThem || blockStatus.theyBlockedMe
  const blockedByThem = blockStatus.theyBlockedMe && !blockStatus.iBlockedThem
  const activeMatchMsgIndex = matchCount > 0 ? matches[matchIndex] : -1

  return (
    <div className='chat-shell'>
      {/* Navbar hidden on mobile when chat is open */}
      {!isMobile && <Navbar />}
      <div className='chat-body'>
        {/* Sidebar hidden on mobile when chat is open */}
        {!isMobile && <Sidebar />}
        <div className='chat-main'>

          {/* ── Header ── */}
          <div className='chat-header' onClick={handleHeaderClick}>

            {/* Back arrow — mobile only */}
            {isMobile && (
              <button
                className='chat-header-back-btn'
                onClick={handleMobileBack}
                aria-label='Back to chats'
              >
                <ArrowLeft size={20} />
              </button>
            )}

            <div className='chat-header-avatar-wrap'>
              <div className='chat-header-avatar'>
                {roomLoading && !displayName ? (
                  <span className='chat-header-avatar-loading'>…</span>
                ) : headerAvatar ? (
                  <img
                    src={headerAvatar}
                    alt={displayName}
                    className='chat-header-avatar-img'
                  />
                ) : (
                  <span className='chat-header-avatar-initials'>{initials}</span>
                )}
              </div>
              {isOnline && !onlineStatusHidden && <span className='chat-header-online-dot' />}
            </div>

            <div className='chat-header-info'>
              {roomLoading && !displayName ? (
                <>
                  <span className='chat-skeleton-name' />
                  <span className='chat-skeleton-status' />
                </>
              ) : (
                <>
                  <span className='chat-header-name'>{displayName || '…'}</span>
                  <span className={`chat-header-status ${isOnline ? '' : 'offline'}`}>
                    {isPending
                      ? 'Message Request'
                      : onlineStatusHidden
                        ? ''
                        : isOnline
                          ? 'Online'
                          : displayLastSeen
                            ? `Last seen ${new Date(displayLastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : 'Offline'
                    }
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
                <Search size={18} />
              </button>
              <div ref={headerMenuRef} style={{ position: 'relative' }}>
                <button
                  className='chat-header-icon'
                  title='More'
                  onClick={e => { e.stopPropagation(); setShowHeaderMenu(v => !v) }}
                >
                  <MoreVertical size={18} />
                </button>
                {showHeaderMenu && (
                  <div className='dropdown-menu' style={{ position: 'absolute', top: '100%', right: 0, zIndex: 50 }}>
                    <button className='dropdown-item' onClick={e => { e.stopPropagation(); handleClearChat() }} disabled={clearing}>
                      <Trash2 size={16} />
                      <span>Clear chat</span>
                    </button>
                    {!room?.isGroup && otherUserId && (
                      <>
                        <div className='dropdown-separator' />
                        <button className='dropdown-item danger' onClick={e => { e.stopPropagation(); handleToggleBlock() }} disabled={blocking}>
                          {blockStatus.iBlockedThem ? <Shield size={16} /> : <ShieldOff size={16} />}
                          <span>{blockStatus.iBlockedThem ? `Unblock ${displayName}` : `Block ${displayName}`}</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Search Bar ── */}
          {searchOpen && (
            <div className='chat-search-bar'>
              <div className='chat-search-pill'>
                <Search size={15} style={{ color: 'var(--color-text-dim)' }} />
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
                <ChevronUp size={14} />
              </button>
              <button className='chat-search-nav-btn' onClick={goNext} disabled={matchCount < 2} title='Next (Enter)'>
                <ChevronDown size={14} />
              </button>
              <button className='chat-search-close-btn' onClick={closeSearch} title='Close (Esc)'>
                <X size={14} />
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
            onReply={setReplyTo}
            onScrollToMessage={handleScrollToMessage}
            otherUserPrivacy={otherUserPrivacy || otherUser?.privacy || null}
          />

          {/* ── Input / blocked / pending banners ── */}
          {isPending ? (
            <div className='chat-blocked-input'>
              <p>Accept the request to send messages.</p>
            </div>
          ) : blockedByThem ? (
            <div className='chat-blocked-banner'>
              <span className='chat-blocked-icon'>
                <Ban size={20} />
              </span>
              <div>
                <p className='chat-blocked-title'>You can&apos;t send messages to {displayName}</p>
                <p className='chat-blocked-sub'>This user has restricted who can message them.</p>
              </div>
            </div>
          ) : blockStatus.iBlockedThem ? (
            <div className='chat-blocked-banner'>
              <span className='chat-blocked-icon'>
                <Ban size={20} />
              </span>
              <div>
                <p className='chat-blocked-title'>You have blocked {displayName}</p>
                <p className='chat-blocked-sub'>
                  Unblock from{' '}
                  <span className='chat-unblock-link' onClick={handleHeaderClick}>
                    Contact Info
                  </span>
                  {' '}to send messages.
                </p>
              </div>
            </div>
          ) : (
            <MessageInput onSend={sendMessage} roomId={roomId} disabled={isBlocked} isGroup={false} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
          )}

        </div>
      </div>
    </div>
  )
}

export default Chat