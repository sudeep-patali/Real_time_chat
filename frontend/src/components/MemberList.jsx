import { useNavigate } from 'react-router-dom'
import { generateAvatar } from '../utils/generateAvatar'
import * as userService from '../services/userService'

// MemberList — scrollable list of group members with role badges.
// Rendered inside GroupChat.jsx right panel or GroupInfo.jsx.
// Matches the inline-style pattern used across all Phase 7 components.
// Admins see a "Remove" button next to each non-admin member.

function MemberList({ members = [], roomId, currentUserId, isAdmin = false }) {
  const navigate = useNavigate()

  const handleRemove = async (e, userId) => {
    e.stopPropagation()
    if (!window.confirm('Remove this member from the group?')) return
    try {
      await userService.removeFromGroup(userId, roomId)
    } catch (err) {
      console.error('Failed to remove member:', err)
    }
  }

  if (!members.length) {
    return <div style={s.empty}>No members to display.</div>
  }

  return (
    <div style={s.list}>
      {members.map((member, i) => {
        const isCurrentUser  = member.id === currentUserId
        const memberIsAdmin  = member.role === 'admin'
        const avatarSrc      = member.avatar || generateAvatar(member.name || 'User')

        return (
          <div key={member.id}>
            <div
              style={s.row}
              onClick={() => navigate(`/user/${member.id}`)}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-2)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {/* Avatar + online dot */}
              <div style={s.avatarWrap}>
                <img src={avatarSrc} alt={member.name} style={s.avatar} />
                {member.isOnline && <span style={s.onlineDot} />}
              </div>

              {/* Name + role subtitle */}
              <div style={s.info}>
                <span style={s.name}>
                  {member.name}
                  {isCurrentUser && <span style={s.youLabel}> (You)</span>}
                </span>
                <span style={s.sub}>
                  {memberIsAdmin ? 'Group Admin' : 'Member'}
                </span>
              </div>

              {/* Admin badge OR remove button */}
              {memberIsAdmin ? (
                <span style={s.adminBadge}>Admin</span>
              ) : isAdmin && !isCurrentUser ? (
                <button
                  style={s.removeBtn}
                  onClick={(e) => handleRemove(e, member.id)}
                  title={`Remove ${member.name}`}
                >
                  Remove
                </button>
              ) : null}
            </div>

            {i < members.length - 1 && <div style={s.divider} />}
          </div>
        )
      })}
    </div>
  )
}

const s = {
  list: {
    display: 'flex',
    flexDirection: 'column',
  },
  empty: {
    padding: '16px 20px',
    fontSize: 13,
    color: 'var(--color-text-muted)',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 4px',
    cursor: 'pointer',
    borderRadius: 8,
    transition: 'background-color 0.12s ease',
  },
  avatarWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    objectFit: 'cover',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: 'var(--color-online)',
    border: '2px solid var(--color-surface)',
  },
  info: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--color-text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  youLabel: {
    fontSize: 12,
    color: 'var(--color-text-muted)',
    fontWeight: 400,
  },
  sub: {
    fontSize: 11,
    color: 'var(--color-text-dim)',
  },
  adminBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: '3px 10px',
    borderRadius: 20,
    background: 'rgba(245,158,11,0.12)',
    color: '#f59e0b',
    letterSpacing: '0.3px',
    flexShrink: 0,
  },
  removeBtn: {
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: 20,
    background: 'rgba(241,92,109,0.1)',
    color: 'var(--color-error)',
    border: 'none',
    cursor: 'pointer',
    flexShrink: 0,
  },
  divider: {
    height: 1,
    background: 'var(--color-divider)',
    margin: '2px 0',
  },
}

export default MemberList