import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGroupInviteStore } from '../store/groupInviteStore'
import * as groupService from '../services/groupService'
import { useChatStore } from '../store/chatStore'
import { generateAvatar } from '../utils/generateAvatar'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'

export default function GroupInvitations() {
  const navigate        = useNavigate()
  const invitations     = useGroupInviteStore(state => state.invitations)
  const setInvitations  = useGroupInviteStore(state => state.setInvitations)
  const removeInvitation = useGroupInviteStore(state => state.removeInvitation)
  const addRoom         = useChatStore(state => state.addRoom)
  const [loading, setLoading] = useState(true)
  const [busy,    setBusy]    = useState(null)  // invitationId currently processing

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
        const normalised = {
          ...room,
          id:             roomId,
          isGroup:        true,
          participantIds: (room.participantIds || []).map(p =>
            typeof p === 'object' ? { ...p, id: p._id || p.id } : p
          ),
          lastMessage: room.lastMessage
            ? {
                content:    room.lastMessage.content || '',
                timestamp:  room.lastMessage.createdAt || room.lastMessage.timestamp,
                senderName: room.lastMessage.senderId?.name || ''
              }
            : null,
        }
        addRoom(normalised)
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

  return (
    <div style={s.shell}>
      <Navbar />
      <div style={s.body}>
        <Sidebar />
        <div style={s.main}>
          {/* Top bar */}
          <div style={s.topBar}>
            <button style={s.backBtn} onClick={() => navigate(-1)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div>
              <p style={s.topBarTitle}>Group Invitations</p>
              <p style={s.topBarSub}>{invitations.length} pending</p>
            </div>
          </div>

          {/* List */}
          <div style={s.list}>
            {loading ? (
              <div style={s.centered}>
                <div style={s.spinner} />
                <p style={s.hint}>Loading invitations…</p>
              </div>
            ) : invitations.length === 0 ? (
              <div style={s.centered}>
                <p style={s.emptyIcon}>👥</p>
                <p style={s.emptyTitle}>No group invitations</p>
                <p style={s.emptySub}>When someone invites you to a group, it will appear here.</p>
              </div>
            ) : (
              invitations.map(inv => {
                const groupName   = inv.group?.name || 'Unknown Group'
                const inviterName = inv.invitedBy?.name || 'Someone'
                const groupAvatar = inv.group?.avatarUrl || generateAvatar(groupName)
                const isBusy      = busy === inv.id

                return (
                  <div key={inv.id} style={s.card}>
                    {/* Group avatar + info */}
                    <div style={s.cardTop}>
                      <img src={groupAvatar} alt={groupName} style={s.groupAvatar} />
                      <div style={s.cardInfo}>
                        <p style={s.inviteLabel}>
                          <span style={s.inviterName}>{inviterName}</span>
                          {' invited you to join:'}
                        </p>
                        <p style={s.groupName}>{groupName}</p>
                        {inv.group?.description && (
                          <p style={s.groupDesc}>{inv.group.description}</p>
                        )}
                        {inv.group?.memberCount > 0 && (
                          <p style={s.memberCount}>{inv.group.memberCount} members</p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={s.actions}>
                      <button
                        style={{ ...s.rejectBtn, opacity: isBusy ? 0.5 : 1 }}
                        onClick={() => handleReject(inv)}
                        disabled={isBusy}
                      >
                        {isBusy ? '…' : 'Reject'}
                      </button>
                      <button
                        style={{ ...s.acceptBtn, opacity: isBusy ? 0.5 : 1 }}
                        onClick={() => handleAccept(inv)}
                        disabled={isBusy}
                      >
                        {isBusy ? '…' : 'Accept'}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  shell:      { height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)', overflow: 'hidden' },
  body:       { flex: 1, display: 'flex', overflow: 'hidden' },
  main:       { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topBar:     { display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', height: 59, minHeight: 59, backgroundColor: 'var(--color-header-bg)', borderBottom: '1px solid var(--color-border)', flexShrink: 0 },
  backBtn:    { background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  topBarTitle:{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 1 },
  topBarSub:  { fontSize: 12, color: 'var(--color-text-muted)' },
  list:       { flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 },
  centered:   { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 10, paddingTop: 60 },
  spinner:    { width: 28, height: 28, border: '2px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  hint:       { fontSize: 13, color: 'var(--color-text-muted)' },
  emptyIcon:  { fontSize: 48, opacity: 0.3 },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: 'var(--color-text)' },
  emptySub:   { fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: 280 },

  card:       { backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 },
  cardTop:    { display: 'flex', gap: 14, alignItems: 'flex-start' },
  groupAvatar:{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--color-border)' },
  cardInfo:   { flex: 1, minWidth: 0 },
  inviteLabel:{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 },
  inviterName:{ fontWeight: 600, color: 'var(--color-text)' },
  groupName:  { fontSize: 17, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 },
  groupDesc:  { fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 2 },
  memberCount:{ fontSize: 12, color: 'var(--color-text-dim)' },

  actions:    { display: 'flex', gap: 10, justifyContent: 'flex-end' },
  rejectBtn:  { padding: '8px 22px', borderRadius: 8, border: '1px solid var(--color-error)', backgroundColor: 'transparent', color: 'var(--color-error)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s' },
  acceptBtn:  { padding: '8px 22px', borderRadius: 8, border: 'none', backgroundColor: 'var(--color-primary)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s' },
}