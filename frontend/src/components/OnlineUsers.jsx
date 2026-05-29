import { useChatStore } from '../store/chatStore'
import { generateAvatar } from '../utils/generateAvatar'

function OnlineUsers() {
  const onlineUsers = useChatStore(state => state.onlineUsers)

  if (onlineUsers.length === 0) return null

  return (
    <div style={styles.container}>
      <p style={styles.label}>Online</p>
      <div style={styles.list}>
        {onlineUsers.map(userId => (
          <div key={userId} style={styles.userWrapper}>
            <img
              src={generateAvatar(`User ${userId}`)}
              alt={userId}
              style={styles.avatar}
            />
            <span style={styles.dot} />
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  container: {
    padding: '8px 16px',
    borderBottom: '1px solid var(--color-border)',
  },
  label: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },
  list: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  userWrapper: {
    position: 'relative',
    width: '32px',
    height: '32px',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
  },
  dot: {
    position: 'absolute',
    bottom: '0',
    right: '0',
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-online)',
    border: '2px solid var(--color-surface)',
  }
}

export default OnlineUsers