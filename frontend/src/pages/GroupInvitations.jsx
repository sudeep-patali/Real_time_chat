import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGroupInviteStore } from '../store/groupInviteStore'
import * as groupService from '../services/groupService'
import { useChatStore } from '../store/chatStore'
import { useMobileNav } from '../hooks/useMobileNav'
import { generateAvatar } from '../utils/generateAvatar'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import MobilePageHeader from '../components/MobilePageHeader'
import { ArrowLeft, Users, Check, X } from 'lucide-react'
import '../styles/groupinvitations.css'
import '../styles/mobile-page.css'

// ── Shared inner content ────────────────────────────────────────────────────
function GroupInvitationsContent({ invitations, loading, busy, onAccept, onReject }) {
  if (loading) {
    return (
      <div className='ginv-state'>
        <div className='ginv-spinner' />
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>Loading…</p>
      </div>
    )
  }

  if (invitations.length === 0) {
    return (
      <div className='ginv-state'>
        <div className='ginv-empty-icon'><Users size={30} /></div>
        <p className='ginv-empty-title'>No pending invitations</p>
        <p className='ginv-empty-sub'>When someone invites you to a group, it will appear here.</p>
      </div>
    )
  }

  return (
    <div className='ginv-scroll'>
      <div className='ginv-list'>
        {invitations.map(inv => {
          const groupName   = inv.group?.name || 'Unknown Group'
          const inviterName = inv.invitedBy?.name || 'Someone'
          const groupAvatar = inv.group?.avatarUrl || generateAvatar(groupName)
          const memberCount = inv.group?.memberCount ?? (inv.group?.members?.length || 0)
          const members     = inv.group?.members || []
          const isBusy      = busy === inv.id

          return (
            <div key={inv.id} className='ginv-card'>

              <div className='ginv-card-header'>
                <img src={groupAvatar} alt={groupName} className='ginv-avatar' />
                <div className='ginv-info'>
                  <p className='ginv-inviter-line'>
                    <span className='ginv-inviter-name'>{inviterName}</span> invited you to join
                  </p>
                  <p className='ginv-group-name'>{groupName}</p>
                  {inv.group?.description && (
                    <p className='ginv-group-desc'>{inv.group.description}</p>
                  )}
                </div>
              </div>

              <div className='ginv-meta'>
                {memberCount > 0 && (
                  <span className='ginv-member-pill'>
                    <Users size={10} />
                    {memberCount} member{memberCount !== 1 ? 's' : ''}
                  </span>
                )}
                {members.length > 0 && (
                  <div className='ginv-stack'>
                    {members.slice(0, 5).map((m, i) => (
                      <img
                        key={i}
                        src={m.avatar || generateAvatar(m.name || 'U')}
                        alt={m.name}
                        className='ginv-stack-img'
                        title={m.name}
                      />
                    ))}
                    {members.length > 5 && (
                      <span className='ginv-stack-more'>+{members.length - 5}</span>
                    )}
                  </div>
                )}
              </div>

              <div className='ginv-actions'>
                <button className='ginv-btn-decline' onClick={() => onReject(inv)} disabled={isBusy}>
                  {isBusy ? <span className='ginv-btn-spinner' /> : <X size={13} />}
                  Decline
                </button>
                <button className='ginv-btn-accept' onClick={() => onAccept(inv)} disabled={isBusy}>
                  {isBusy ? <span className='ginv-btn-spinner' /> : <Check size={13} />}
                  Accept & Join
                </button>
              </div>

            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function GroupInvitations() {
  const navigate         = useNavigate()
  const invitations      = useGroupInviteStore(state => state.invitations)
  const setInvitations   = useGroupInviteStore(state => state.setInvitations)
  const removeInvitation = useGroupInviteStore(state => state.removeInvitation)
  const addRoom          = useChatStore(state => state.addRoom)
  const { isMobile }     = useMobileNav()
  const [loading, setLoading] = useState(true)
  const [busy,    setBusy]    = useState(null)

  useEffect(() => {
    groupService.getPendingInvitations()
      .then(res => setInvitations(res.data.invitations || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleAccept = async (inv) => {
    setBusy(inv.id)
    try {
      const res  = await groupService.acceptInvitation(inv.id)
      const room = res.data.room
      if (room) {
        const roomId = room._id || room.id
        addRoom({
          ...room, id: roomId, isGroup: true,
          participantIds: (room.participantIds || []).map(p =>
            typeof p === 'object' ? { ...p, id: p._id || p.id } : p
          ),
          lastMessage: room.lastMessage ? {
            content:    room.lastMessage.content || '',
            timestamp:  room.lastMessage.createdAt || room.lastMessage.timestamp,
            senderName: room.lastMessage.senderId?.name || ''
          } : null,
        })
        removeInvitation(inv.id)
        navigate(`/group/${roomId}`)
      } else {
        removeInvitation(inv.id)
        navigate('/')
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept invitation')
    } finally {
      setBusy(null)
    }
  }

  const handleReject = async (inv) => {
    setBusy(inv.id)
    try {
      await groupService.rejectInvitation(inv.id)
      removeInvitation(inv.id)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject invitation')
    } finally {
      setBusy(null)
    }
  }

  const pendingLabel = loading
    ? 'Loading…'
    : invitations.length === 0 ? null
    : `${invitations.length} pending`

  const sharedProps = { invitations, loading, busy, onAccept: handleAccept, onReject: handleReject }

  // ── MOBILE: full-screen page ────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className='mph-shell'>
        <MobilePageHeader
          title='Group Invitations'
          fallbackPath='/'
          trailing={
            pendingLabel
              ? <span className='mph-status-pill'>{pendingLabel}</span>
              : null
          }
        />
        <div className='mph-content'>
          <GroupInvitationsContent {...sharedProps} />
        </div>
      </div>
    )
  }

  // ── DESKTOP: original layout unchanged ──────────────────────────────────────
  return (
    <div className='ginv-shell'>
      <Navbar />
      <div className='ginv-body'>
        <Sidebar />
        <div className='ginv-main'>

          <div className='ginv-topbar'>
            <button className='ginv-back-btn' onClick={() => navigate(-1)}>
              <ArrowLeft size={20} />
            </button>
            <div className='ginv-topbar-info'>
              <p className='ginv-topbar-title'>Group Invitations</p>
              <p className='ginv-topbar-sub'>
                {loading ? 'Loading…'
                  : invitations.length === 0 ? 'No pending invitations'
                  : `${invitations.length} pending invitation${invitations.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            {!loading && invitations.length > 0 && (
              <span className='ginv-count-badge'>{invitations.length}</span>
            )}
          </div>

          <GroupInvitationsContent {...sharedProps} />

        </div>
      </div>
    </div>
  )
}