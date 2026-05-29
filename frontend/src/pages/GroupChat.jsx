import { useParams, useNavigate } from 'react-router-dom'
import { useChat } from '../hooks/useChat'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import ChatBox from '../components/ChatBox'
import MessageInput from '../components/MessageInput'
import '../styles/chat.css'

function GroupChat() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { messages, typingUsers, sendMessage } = useChat(roomId)
  const { currentUser } = useAuth()

  const dummyMembers = [
    { id: '1', name: 'Test User', role: 'admin' },
    { id: '2', name: 'Alex',     role: 'member' },
    { id: '3', name: 'Jordan',   role: 'member' },
  ]

  const groupName = 'Team Wheeltrix'

  const handleHeaderClick = () => {
    navigate(`/group/${roomId}/info`)
  }

  return (
    <div style={styles.shell}>
      <Navbar />
      <div style={styles.body}>
        <Sidebar />

        <div style={styles.main}>

          {/* ── Group Chat Header ── */}
          <div className="chat-header" onClick={handleHeaderClick}>
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
                }}
              >
                TW
              </div>
            </div>

            <div className="chat-header-info">
              <span className="chat-header-name">{groupName}</span>
              <span className="chat-header-status offline">
                {dummyMembers.map(m => m.name).join(', ')}
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

export default GroupChat