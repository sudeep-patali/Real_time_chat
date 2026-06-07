import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChat } from '../hooks/useChat'
import { useAuth } from '../hooks/useAuth'
import { useChatStore } from '../store/chatStore'
import { useRooms } from '../hooks/useRooms'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import ChatBox from '../components/ChatBox'
import MessageInput from '../components/MessageInput'
import '../styles/chat.css'

function GroupChat() {
  const { roomId }   = useParams()
  const navigate     = useNavigate()
  const { messages, typingUsers, sendMessage, editMessage, deleteMessage } = useChat(roomId)
  const { currentUser } = useAuth()
  const rooms        = useChatStore(state => state.rooms)

  // ── Search state ──
  const [searchOpen,  setSearchOpen]  = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [matchIndex,  setMatchIndex]  = useState(0)
  const searchInputRef = useRef(null)

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

  return (
    <div style={styles.shell}>
      <Navbar />
      <div style={styles.body}>
        <Sidebar />
        <div style={styles.main}>

          {/* ── Header ── */}
          <div className='chat-header' onClick={() => navigate(`/group/${roomId}/info`)}>
            <div className='chat-header-avatar-wrap'>
              <div className='chat-header-avatar' style={{
                background: '#7c6ef7', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15,
                overflow: 'hidden', padding: 0,
              }}>
                {groupAvatar
                  ? <img src={groupAvatar} alt={groupName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                  : initials}
              </div>
            </div>

            <div className='chat-header-info'>
              <span className='chat-header-name'>{groupName}</span>
              <span className='chat-header-status offline' style={{ fontSize: 11 }}>
                {memberNames || 'Group'}
              </span>
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

          <MessageInput onSend={sendMessage} roomId={roomId} isGroup={true} />
        </div>
      </div>
    </div>
  )
}

const styles = {
  shell: { height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)', overflow: 'hidden' },
  body:  { flex: 1, display: 'flex', overflow: 'hidden' },
  main:  { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' },
}

export default GroupChat