import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChat } from '../hooks/useChat'
import { useAuth } from '../hooks/useAuth'
import { useChatStore } from '../store/chatStore'
import { useRooms } from '../hooks/useRooms'
import { useMobileNav } from '../hooks/useMobileNav'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import ChatBox from '../components/ChatBox'
import MessageInput from '../components/MessageInput'
import { Search, MoreVertical, ArrowLeft } from 'lucide-react'
import '../styles/chat.css'

function GroupChat() {
  const { roomId }   = useParams()
  const navigate     = useNavigate()
  const { isMobile } = useMobileNav()
  const { messages, typingUsers, sendMessage, editMessage, deleteMessage } = useChat(roomId)
  const { currentUser } = useAuth()
  const rooms        = useChatStore(state => state.rooms)

  // ── Search state ──
  const [searchOpen,  setSearchOpen]  = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [matchIndex,  setMatchIndex]  = useState(0)
  const searchInputRef = useRef(null)
  const [replyTo, setReplyTo] = useState(null)

  const handleScrollToMessage = (messageId) => {
    const el = document.querySelector(`[data-message-id="${messageId}"]`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('message-highlight')
    setTimeout(() => el.classList.remove('message-highlight'), 2100)
  }

  useRooms()

  // Get real group data from store
  const room      = rooms.find(r => (r.id || r._id) === roomId)
  const groupName = room?.groupName || room?.name || 'Group'
  const members   = room?.participantIds || []

  const memberNames = members
    .map(m => m?.name || '')
    .filter(Boolean)
    .join(', ')

  const initials = groupName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const groupAvatar = room?.groupAvatar || room?.avatarUrl || null

  // ── Search helpers ──
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
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); searchOpen ? closeSearch() : openSearch() }
      if (e.key === 'Escape' && searchOpen) closeSearch()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [searchOpen, openSearch, closeSearch])

  const goNext = () => { if (matchCount) setMatchIndex(i => (i + 1) % matchCount) }
  const goPrev = () => { if (matchCount) setMatchIndex(i => (i - 1 + matchCount) % matchCount) }

  const activeMatchMsgIndex = matchCount > 0 ? matches[matchIndex] : -1

  // ── Mobile back — return to chat list, preserving browser history ──
  const handleMobileBack = (e) => {
    e.stopPropagation()
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1)
    } else {
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="chat-shell">
      {/* Navbar hidden on mobile when chat is open */}
      {!isMobile && <Navbar />}
      <div className="chat-body">
        {/* Sidebar hidden on mobile when chat is open */}
        {!isMobile && <Sidebar />}
        <div className="chat-main">

          {/* ── Header ── */}
          <div className="chat-header" onClick={() => navigate(`/group/${roomId}/info`)}>

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

            <div className="chat-header-avatar-wrap">
              <div
                className="chat-header-avatar"
                style={{
                  background: '#7c6ef7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 15,
                  overflow: 'hidden',
                  padding: 0,
                }}
              >
                {groupAvatar
                  ? <img src={groupAvatar} alt={groupName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                  : initials}
              </div>
            </div>

            <div className="chat-header-info">
              <span className="chat-header-name">{groupName}</span>
              <span className="chat-header-status offline" style={{ fontSize: 11 }}>
                {memberNames || 'Group'}
              </span>
            </div>

            <div className="chat-header-actions">
              <button
                className="chat-header-icon"
                title="Search in chat (Ctrl+F)"
                onClick={e => { e.stopPropagation(); openSearch() }}
              >
                <Search size={18} />
              </button>
              <button
                className="chat-header-icon"
                title="More"
                onClick={e => e.stopPropagation()}
              >
                <MoreVertical size={18} />
              </button>
            </div>
          </div>

          {/* ── Search Bar ── */}
          {searchOpen && (
            <div className="chat-search-bar">
              <div className="chat-search-pill">
                <Search size={15} style={{ color: 'var(--color-text-dim)', flexShrink: 0 }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search messages…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') e.shiftKey ? goPrev() : goNext()
                    if (e.key === 'Escape') closeSearch()
                  }}
                  autoComplete="off"
                  spellCheck={false}
                />
                {searchQuery && (
                  <span className="chat-search-count">
                    {matchCount === 0 ? 'No results' : `${matchIndex + 1} / ${matchCount}`}
                  </span>
                )}
              </div>
              <button className="chat-search-nav-btn" onClick={goPrev} disabled={matchCount < 2} title="Previous (Shift+Enter)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
              </button>
              <button className="chat-search-nav-btn" onClick={goNext} disabled={matchCount < 2} title="Next (Enter)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
              </button>
              <button className="chat-search-close-btn" onClick={closeSearch} title="Close (Esc)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
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
          />

          <MessageInput onSend={sendMessage} roomId={roomId} isGroup={true} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
        </div>
      </div>
    </div>
  )
}

export default GroupChat