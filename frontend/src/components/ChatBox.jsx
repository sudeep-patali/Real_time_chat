import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'
import '../styles/chat.css'

// Groups messages by date and inserts dividers — pure UI logic
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
    groups.push({ type: 'message', msg })
  })

  return groups
}

function ChatBox({ messages, typingUsers, currentUserId }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const grouped = groupByDate(messages)

  return (
    <div className='chat-area'>

      {messages.length === 0 ? (
        /* ── Empty state ── */
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
          return (
            <MessageBubble
              key={item.msg.id}
              message={item.msg}
              isOwn={item.msg.senderId === currentUserId}
            />
          )
        })
      )}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className='typing-indicator'>
          <span className='typing-dot' />
          <span className='typing-dot' />
          <span className='typing-dot' />
        </div>
      )}

      {/* Auto-scroll anchor */}
      <div ref={bottomRef} />
    </div>
  )
}

export default ChatBox