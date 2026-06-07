import { generateAvatar } from '../utils/generateAvatar'

function UserSearchCard({ user, onClick }) {
  const avatarSrc = user.avatar || generateAvatar(user.name)

  return (
    <div style={s.card} onClick={() => onClick(user)}>
      <div style={s.avatarWrap}>
        <img src={avatarSrc} alt={user.name} style={s.avatar} />
        {user.isOnline && <span style={s.dot} />}
      </div>
      <div style={s.info}>
        <p style={s.name}>{user.name}</p>
        <p style={s.email}>{user.email}</p>
        {user.bio && <p style={s.bio}>{user.bio}</p>}
      </div>
      <span style={{
        ...s.status,
        color: user.isOnline ? 'var(--color-online)' : 'var(--color-text-dim)'
      }}>
        {user.isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  )
}

const s = {
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid var(--color-divider)',
    transition: 'background 0.15s',
    backgroundColor: 'transparent',
  },
  avatarWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    objectFit: 'cover',
  },
  dot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: 'var(--color-online)',
    border: '2px solid var(--color-surface)',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-text)',
    marginBottom: 2,
  },
  email: {
    fontSize: 12,
    color: 'var(--color-text-muted)',
    marginBottom: 2,
  },
  bio: {
    fontSize: 12,
    color: 'var(--color-text-dim)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  status: {
    fontSize: 11,
    fontWeight: 600,
    flexShrink: 0,
  }
}

export default UserSearchCard