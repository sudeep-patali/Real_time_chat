import { useEffect, useRef } from 'react'
import { useChatStore } from '../store/chatStore'
import MessageBubble    from './MessageBubble'
import '../styles/chat.css'

function groupByDate(messages) {
  const groups = []
  let lastDate  = null

  messages.forEach(msg => {
    const d     = msg.timestamp ? new Date(msg.timestamp) : null
    const label = d
      ? d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
      : null

    if (label && label !== lastDate) {
      groups.push({ type: 'divider', label, id: `div-${label}` })
      lastDate = label
    }
    groups.push({ type: 'message', msg, originalIndex: groups.filter(g => g.type === 'message').length })
  })

  return groups
}

/**
 * Returns true if every non-deleted message in the list has encrypted=true.
 * Used to decide whether to show the E2E banner.
 */
function isEncryptedRoom(messages) {
  const textMsgs = messages.filter(m => !m.isDeleted && m.type === 'text')
  return textMsgs.length > 0 && textMsgs.every(m => m.encrypted)
}

function ChatBox({ messages, typingUsers, currentUserId, searchQuery = '', activeMatchMsgIndex = -1, onEditMessage, onDeleteMessage }) {
  const bottomRef     = useRef(null)
  const activeRef     = useRef(null)
  const prevSearchRef = useRef('')
  const typingUserMap = useChatStore(state => state.typingUserMap)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!searchQuery) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, searchQuery])

  // Scroll active search match into view
  useEffect(() => {
    if (searchQuery && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    if (!searchQuery && prevSearchRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevSearchRef.current = searchQuery
  }, [searchQuery, activeMatchMsgIndex])

  const grouped    = groupByDate(messages)
  let   msgCounter = 0

  const typingLabel = (() => {
    const names = Object.values(typingUserMap || {}).filter(Boolean)
    if (names.length === 0) return null
    if (names.length === 1) return `${names[0]} is typing…`
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`
    return `${names[0]}, ${names[1]} and ${names.length - 2} more are typing…`
  })()

  const showTyping         = typingUsers.length > 0
  const currentUserIdStr   = currentUserId?.toString?.() ?? String(currentUserId ?? '')
  const showEncryptedBanner = isEncryptedRoom(messages)

  return (
    <div className='chat-area'>

      {/* ── E2E Encrypted room banner ── */}
      {showEncryptedBanner && (
        <div style={styles.encryptedBanner}>
          🔒 End-to-end encrypted
        </div>
      )}

      {messages.length === 0 ? (
        <div className='chat-empty'>
          <span className='chat-empty-icon'>🔒</span>
          <p>Messages are end-to-end encrypted.</p>
          <p style={{ marginTop: 4, fontSize: 12, opacity: 0.6 }}>
            No one outside of this chat can read them.
          </p>
        </div>
      ) : (
        grouped.map(item => {
          if (item.type === 'divider') {
            return (
              <div key={item.id} className='chat-date-divider'>
                <span>{item.label}</span>
              </div>
            )
          }

          const currentMsgIndex = msgCounter++
          const msgSenderIdStr  = item.msg.senderId?.toString?.() ?? String(item.msg.senderId ?? '')
          const isOwnMsg        = msgSenderIdStr !== '' && currentUserIdStr !== '' && msgSenderIdStr === currentUserIdStr
          const isActive        = searchQuery && currentMsgIndex === activeMatchMsgIndex
          const q               = searchQuery.trim().toLowerCase()
          const isMatch         = q
            ? item.msg.type === 'text' && item.msg.content?.toLowerCase().includes(q)
            : false

          // ── Decrypt-failed fallback ──────────────────────────────────────
          const msgToRender = item.msg.decryptFailed
            ? { ...item.msg, content: '⚠ Unable to decrypt' }
            : item.msg

          return (
            <div
              key={item.msg.id}
              ref={isActive ? activeRef : null}
              style={isActive
                ? { ...styles.activeMatchWrapper, alignSelf: isOwnMsg ? 'flex-end' : 'flex-start' }
                : { display: 'contents' }
              }
            >
              <MessageBubble
                message={msgToRender}
                isOwn={isOwnMsg}
                searchQuery={searchQuery}
                isActiveMatch={isActive}
                isMatch={isMatch}
                onEdit={onEditMessage}
                onDelete={onDeleteMessage}
              />
              {/* Lock icon on encrypted messages */}
              {item.msg.encrypted && !item.msg.decryptFailed && (
                <span style={styles.lockIcon} title='End-to-end encrypted'>🔒</span>
              )}
              {/* Warning badge on decrypt-failed messages */}
              {item.msg.decryptFailed && (
                <span style={styles.warnIcon} title='Unable to decrypt — key may have changed'>⚠</span>
              )}
            </div>
          )
        })
      )}

      {/* ── Typing Indicator ── */}
      {showTyping && (
        <div className='typing-indicator-wrap'>
          <div className='typing-indicator'>
            <span className='typing-dot' />
            <span className='typing-dot' />
            <span className='typing-dot' />
          </div>
          {typingLabel && (
            <span className='typing-label'>{typingLabel}</span>
          )}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}

const styles = {
  encryptedBanner: {
    textAlign:       'center',
    fontSize:        12,
    opacity:         0.7,
    padding:         '6px 12px',
    margin:          '8px auto',
    background:      'var(--color-surface, #f0f0f0)',
    borderRadius:    20,
    width:           'fit-content',
    userSelect:      'none',
  },
  lockIcon: {
    fontSize:   10,
    opacity:    0.5,
    alignSelf:  'flex-end',
    marginBottom: 2,
  },
  warnIcon: {
    fontSize:   12,
    color:      '#e67e22',
    alignSelf:  'flex-end',
    marginBottom: 2,
  },
  activeMatchWrapper: {
    borderRadius:  8,
    outline:       '2px solid var(--color-primary)',
    outlineOffset: 2,
    transition:    'outline 0.2s ease',
  },
}

export default ChatBox