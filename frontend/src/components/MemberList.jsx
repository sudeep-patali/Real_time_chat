import { useNavigate } from 'react-router-dom'
import { generateAvatar } from '../utils/generateAvatar'
import * as userService from '../services/userService'

// MemberList — scrollable list of group members with role badges.
// Rendered inside GroupChat.jsx right panel or GroupInfo.jsx.
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
    return <div className="member-list-empty">No members to display.</div>
  }

  return (
    <div className="member-list">
      {members.map((member, i) => {
        const isCurrentUser = member.id === currentUserId
        const memberIsAdmin = member.role === 'admin'
        const avatarSrc     = member.avatar || generateAvatar(member.name || 'User')

        return (
          <div key={member.id}>
            <div
              className="member-list-row"
              onClick={() => navigate(`/user/${member.id}`)}
            >
              {/* Avatar + online dot */}
              <div className="member-avatar-wrap">
                <img src={avatarSrc} alt={member.name} className="member-avatar" />
                {member.isOnline && <span className="member-online-dot" />}
              </div>

              {/* Name + role subtitle */}
              <div className="member-info">
                <span className="member-name">
                  {member.name}
                  {isCurrentUser && <span className="member-you-label"> (You)</span>}
                </span>
                <span className="member-sub">
                  {memberIsAdmin ? 'Group Admin' : 'Member'}
                </span>
              </div>

              {/* Admin badge OR remove button */}
              {memberIsAdmin ? (
                <span className="member-admin-badge">Admin</span>
              ) : isAdmin && !isCurrentUser ? (
                <button
                  className="member-remove-btn"
                  onClick={(e) => handleRemove(e, member.id)}
                  title={`Remove ${member.name}`}
                >
                  Remove
                </button>
              ) : null}
            </div>

            {i < members.length - 1 && <div className="member-divider" />}
          </div>
        )
      })}
    </div>
  )
}

export default MemberList