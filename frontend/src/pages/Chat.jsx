import { useParams, useNavigate } from 'react-router-dom'
import { useChat } from '../hooks/useChat'
import { useAuth } from '../hooks/useAuth'
import { useChatStore } from '../store/chatStore'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import ChatBox from '../components/ChatBox'
import MessageInput from '../components/MessageInput'
import '../styles/chat.css'

function Chat() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { messages, typingUsers, sendMessage } = useChat(roomId)
  const { currentUser } = useAuth()
  const rooms = useChatStore(state => state.rooms)
  const onlineUsers = useChatStore(state => state.onlineUsers)

  // Derive the other participant's info from the room
  const room = rooms.find(r => r.id === roomId)
  const otherUserId = room?.participantIds?.find(id => id !== currentUser?.id) ?? '2'
  const isOnline = onlineUsers.includes(otherUserId)

  // Dummy display name — real app would look up user by otherUserId
  const displayName = otherUserId === '2' ? 'Alex' : otherUserId === '3' ? 'Jordan' : 'User'
  const initials = displayName.slice(0, 2).toUpperCase()

  const handleHeaderClick = () => {
    navigate(`/user/${otherUserId}`)
  }

  return (
    <div style={styles.shell}>
      <Navbar />
      <div style={styles.body}>
        <Sidebar />
        <div style={styles.main}>

          {/* ── Chat Header ── */}
          <div className="chat-header" onClick={handleHeaderClick}>
            <div className="chat-header-avatar-wrap">
              <div
                className="chat-header-avatar"
                style={{
                  background: '#5b8def',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                {initials}
              </div>
              {isOnline && <span className="chat-header-online-dot" />}
            </div>

            <div className="chat-header-info">
              <span className="chat-header-name">{displayName}</span>
              <span className={`chat-header-status ${isOnline ? '' : 'offline'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="chat-header-actions">
              <button
                className="chat-header-icon"
                title="Search"
                onClick={e => e.stopPropagation()}
              >
                🔍
              </button>
              <button
                className="chat-header-icon"
                title="More options"
                onClick={e => e.stopPropagation()}
              >
                ⋮
              </button>
            </div>
          </div>

          <ChatBox
            messages={messages}
            typingUsers={typingUsers}
            currentUserId={currentUser?.id}
          />
          <MessageInput onSend={sendMessage} roomId={roomId} />
        </div>
      </div>
    </div>
  )
}

const styles = {
  shell: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--color-bg)',
    overflow: 'hidden',
  },
  body: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
}

export default Chat