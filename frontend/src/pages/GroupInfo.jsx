import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import { useNotificationStore } from '../store/notificationStore'
import * as roomService    from '../services/roomService'
import * as groupService   from '../services/groupService'
import * as userService    from '../services/userService'
import * as messageService from '../services/messageService'
import MediaGallery from '../components/MediaGallery'
import { generateAvatar } from '../utils/generateAvatar'
import {
  ArrowLeft, MessageCircle, Bell, BellOff, Pencil,
  Users, MessageSquare, Image, Paperclip, Info,
  User, Calendar, Trash2, LogOut, Flag, Clock,
  Camera, Check, X, UserPlus, ShieldCheck
} from 'lucide-react'
import '../styles/chat.css'
import '../styles/groupinfo.css'

function useDebounce(value, delay = 350) {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return d
}

// ── Stat card ─────────────────────────────────────────────────────────────
function StatCard({ icon, label, value }) {
  return (
    <div className="gi-stat-card">
      <span className="gi-stat-icon">{icon}</span>
      <span className="gi-stat-value">{value}</span>
      <span className="gi-stat-label">{label}</span>
    </div>
  )
}

// ── Avatar change confirmation dialog ────────────────────────────────────
function AvatarChangeDialog({ onConfirm, onCancel }) {
  return (
    <div className="gi-dialog-overlay" onClick={onCancel}>
      <div className="gi-dialog" onClick={e => e.stopPropagation()}>
        <div className="gi-dialog-icon">
          <Camera size={24} />
        </div>
        <h3 className="gi-dialog-title">Change Group Picture</h3>
        <p className="gi-dialog-body">Do you want to change the group profile picture?</p>
        <div className="gi-dialog-actions">
          <button className="gi-dialog-btn gi-dialog-btn--cancel" onClick={onCancel}>
            No
          </button>
          <button className="gi-dialog-btn gi-dialog-btn--confirm" onClick={onConfirm}>
            Yes
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GroupInfo() {
  const { roomId }     = useParams()
  const navigate       = useNavigate()
  const rooms          = useChatStore(state => state.rooms)
  const setMessages    = useChatStore(state => state.setMessages)
  const removeRoom     = useChatStore(state => state.removeRoom)
  const updateRoom     = useChatStore(state => state.updateRoom)
  const toggleMuteRoom = useChatStore(state => state.toggleMuteRoom)
  const clearUnread    = useNotificationStore(state => state.clearUnread)
  const currentUser    = useAuthStore(state => state.currentUser)

  const [group,         setGroup]         = useState(null)
  const [media,         setMedia]         = useState([])
  const [docs,          setDocs]          = useState([])
  const [totalMsgs,     setTotalMsgs]     = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [busy,          setBusy]          = useState('')
  const [activeTab,     setActiveTab]     = useState('info')

  // Edit mode — accessible to all members
  const [editMode,    setEditMode]    = useState(false)
  const [editName,    setEditName]    = useState('')
  const [editDesc,    setEditDesc]    = useState('')
  const [editAvatar,  setEditAvatar]  = useState(null)
  const [editPreview, setEditPreview] = useState(null)
  const [editBusy,    setEditBusy]    = useState(false)

  // Avatar change confirmation dialog (shown on avatar click outside edit mode)
  const [showAvatarDialog, setShowAvatarDialog] = useState(false)

  // Invite panel
  const [showInvite,     setShowInvite]     = useState(false)
  const [inviteSearch,   setInviteSearch]   = useState('')
  const [inviteResults,  setInviteResults]  = useState([])
  const debouncedInvite  = useDebounce(inviteSearch)
  const [selectedInvite, setSelectedInvite] = useState([])
  const [inviting,       setInviting]       = useState(false)
  const [pendingInvites, setPendingInvites] = useState([])

  const liveRoom = rooms.find(r => (r._id || r.id) === roomId)
  const isMuted  = liveRoom?.isMuted || false

  // ── Load group ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return
    setLoading(true)
    roomService.getRoomById(roomId)
      .then(res => {
        const room = res.data.room
        // Build a unified admin ID set: createdBy + adminIds
        const adminIdSet = new Set([
          room.createdBy?._id?.toString() || room.createdBy?.toString(),
          ...(room.adminIds || []).map(id => id?.toString())
        ].filter(Boolean))

        const g = {
          id:          room._id || room.id,
          name:        room.groupName || 'Group',
          description: room.description || '',
          createdAt:   room.createdAt,
          createdBy:   room.createdBy,
          avatarUrl:   room.avatarUrl || null,
          adminIds:    [...adminIdSet],
          members:     (room.participantIds || []).map(p => {
            const pid = (p._id || p.id)?.toString()
            return {
              id:       pid,
              name:     p.name || 'Unknown',
              avatar:   p.avatar || null,
              isOnline: p.isOnline || false,
              role:     adminIdSet.has(pid) ? 'admin' : 'member'
            }
          })
        }
        setGroup(g)
        setEditName(g.name)
        setEditDesc(g.description)
      })
      .catch(() => setError('Could not load group info.'))
      .finally(() => setLoading(false))
  }, [roomId])

  useEffect(() => {
    if (!roomId) return
    roomService.getRoomMedia(roomId)
      .then(res => { setMedia(res.data.media || []); setDocs(res.data.documents || []) })
      .catch(() => {})
  }, [roomId])

  useEffect(() => {
    if (!roomId) return
    messageService.fetchHistory(roomId)
      .then(res => setTotalMsgs((res.data.messages || []).length))
      .catch(() => {})
  }, [roomId])

  useEffect(() => {
    if (roomId) clearUnread(roomId)
  }, [roomId, clearUnread])

  // isAdmin: true if current user is the creator OR in adminIds
  const isAdmin = group?.adminIds?.includes(currentUser?.id?.toString()) ||
                  group?.createdBy?._id === currentUser?.id ||
                  group?.createdBy?.toString() === currentUser?.id?.toString()

  const loadPendingInvites = useCallback(() => {
    if (!group || !isAdmin) return
    groupService.getGroupInvitations(group.id)
      .then(res => setPendingInvites(res.data.invitations || []))
      .catch(() => {})
  }, [group, isAdmin])

  useEffect(() => { loadPendingInvites() }, [loadPendingInvites])

  // ── Invite search ────────────────────────────────────────────────────────
  useEffect(() => {
    const q = debouncedInvite.trim()
    if (!q) { setInviteResults([]); return }
    userService.searchUsers(q)
      .then(res => {
        const all = res.data.users || res.data || []
        const memberIds = (group?.members || []).map(m => m.id?.toString())
        setInviteResults(all.filter(u => {
          const uid = (u._id || u.id)?.toString()
          return uid !== currentUser?.id?.toString() && !memberIds.includes(uid)
        }))
      })
      .catch(() => setInviteResults([]))
  }, [debouncedInvite, group, currentUser])

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleClearChat = async () => {
    if (!window.confirm('Clear all messages? This cannot be undone.')) return
    setBusy('clear')
    try { await roomService.clearChat(roomId); setMessages([]); navigate(-1) }
    catch { alert('Failed to clear chat.') }
    finally { setBusy('') }
  }

  const handleLeave = async () => {
    if (!window.confirm('Leave this group? You will no longer receive messages.')) return
    setBusy('leave')
    try { await groupService.exitGroup(roomId); removeRoom(roomId); navigate('/', { replace: true }) }
    catch { alert('Failed to leave group.') }
    finally { setBusy('') }
  }

  const handleMute = async () => {
    setBusy('mute')
    try { await roomService.muteRoom(roomId); toggleMuteRoom(roomId) }
    catch { alert('Failed to update mute setting.') }
    finally { setBusy('') }
  }

  const handleReport = async () => {
    const reason = window.prompt('Reason for reporting this group? (optional)')
    if (reason === null) return
    setBusy('report')
    try { const r = await roomService.reportRoom(roomId, reason); alert(r.data.message || 'Report submitted.') }
    catch { alert('Failed to submit report.') }
    finally { setBusy('') }
  }

  const handleDeleteGroup = async () => {
    if (!window.confirm('Permanently delete this group and all its messages?')) return
    setBusy('delete')
    try { await groupService.deleteGroup(group.id); removeRoom(group.id); navigate('/', { replace: true }) }
    catch { alert('Failed to delete group.') }
    finally { setBusy('') }
  }

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from the group?`)) return
    try {
      await groupService.removeMember(group.id, memberId)
      setGroup(g => ({ ...g, members: g.members.filter(m => m.id !== memberId) }))
    } catch (err) { alert(err.response?.data?.message || 'Failed to remove member.') }
  }

  const handleMakeAdmin = async (memberId, memberName) => {
    if (!window.confirm(`Make ${memberName} a group admin?`)) return
    try {
      await groupService.makeAdmin(group.id, memberId)
      setGroup(g => ({
        ...g,
        adminIds: [...(g.adminIds || []), memberId],
        members:  g.members.map(m =>
          m.id === memberId ? { ...m, role: 'admin' } : m
        )
      }))
    } catch (err) { alert(err.response?.data?.message || 'Failed to make admin.') }
  }

  // Save edits — members can update avatar/desc, only admins can rename
  const handleSaveEdit = async () => {
    setEditBusy(true)
    try {
      const payload = { description: editDesc.trim(), avatar: editAvatar }
      if (isAdmin) payload.groupName = editName.trim()

      const res = await groupService.updateGroup(group.id, payload)
      const updated = res.data.room
      setGroup(g => ({
        ...g,
        name:        isAdmin ? (updated.groupName || g.name) : g.name,
        description: updated.description ?? g.description,
        avatarUrl:   updated.avatarUrl || g.avatarUrl
      }))
      updateRoom(roomId, {
        groupName:   updated.groupName,
        description: updated.description,
        avatarUrl:   updated.avatarUrl
      })
      setEditMode(false)
      setEditPreview(null)
      setEditAvatar(null)
    } catch (err) { alert(err.response?.data?.message || 'Failed to update group info.') }
    finally { setEditBusy(false) }
  }

  // Avatar click outside edit mode → show confirmation dialog
  const handleAvatarClick = () => {
    setShowAvatarDialog(true)
  }

  const handleAvatarDialogConfirm = () => {
    setShowAvatarDialog(false)
    document.getElementById('gi-quick-avatar-input')?.click()
  }

  // Immediately upload avatar without entering edit mode
  const handleQuickAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setEditBusy(true)
    try {
      const res = await groupService.updateGroup(group.id, { avatar: file })
      const updated = res.data.room
      setGroup(g => ({ ...g, avatarUrl: updated.avatarUrl || preview }))
      updateRoom(roomId, { avatarUrl: updated.avatarUrl })
    } catch (err) { alert(err.response?.data?.message || 'Failed to update avatar.') }
    finally { setEditBusy(false) }
    e.target.value = ''
  }

  const toggleInviteUser = (u) => {
    const uid = u._id || u.id
    setSelectedInvite(prev => {
      const exists = prev.some(x => (x._id || x.id) === uid)
      return exists ? prev.filter(x => (x._id || x.id) !== uid) : [...prev, u]
    })
  }

  const handleSendInvites = async () => {
    if (selectedInvite.length === 0) return
    setInviting(true)
    try {
      await groupService.inviteUsers(group.id, selectedInvite.map(u => u._id || u.id))
      setSelectedInvite([]); setInviteSearch(''); setInviteResults([]); setShowInvite(false)
      loadPendingInvites()
      alert(`Invitation${selectedInvite.length > 1 ? 's' : ''} sent!`)
    } catch (err) { alert(err.response?.data?.message || 'Failed to send invitations.') }
    finally { setInviting(false) }
  }

  const handleCancelInvite = async (invId) => {
    try {
      await groupService.cancelInvitation(group.id, invId)
      setPendingInvites(prev => prev.filter(i => i._id !== invId))
    } catch { alert('Failed to cancel invitation.') }
  }

  // ── Top bar ──────────────────────────────────────────────────────────────
  const TopBar = () => (
    <div className="gi-topbar">
      <button className="gi-back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={20} />
      </button>
      <span className="gi-topbar-title">
        {editMode ? 'Edit Group' : 'Group Info'}
      </span>
    </div>
  )

  if (loading) return (
    <div className="gi-page">
      <TopBar />
      <div className="gi-centered">
        <div className="gi-spinner" />
        <p className="gi-loading-text">Loading…</p>
      </div>
    </div>
  )

  if (error || !group) return (
    <div className="gi-page">
      <TopBar />
      <div className="gi-centered">
        <p style={{ color: 'var(--color-error)', fontSize: 14 }}>{error || 'Group not found.'}</p>
      </div>
    </div>
  )

  const groupAvatarSrc = group.avatarUrl || generateAvatar(group.name)
  const formatDate = iso => iso
    ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'
  const onlineMembers = group.members.filter(m => m.isOnline).length

  const tabs = [
    { key: 'info',    label: 'Info' },
    { key: 'members', label: `Members (${group.members.length})` },
    { key: 'media',   label: `Media${media.length + docs.length > 0 ? ` (${media.length + docs.length})` : ''}` },
  ]

  return (
    <div className="gi-page">
      <TopBar />

      {/* Avatar change confirmation dialog */}
      {showAvatarDialog && (
        <AvatarChangeDialog
          onConfirm={handleAvatarDialogConfirm}
          onCancel={() => setShowAvatarDialog(false)}
        />
      )}

      {/* Hidden file input for quick avatar change (outside edit mode) */}
      <input
        id="gi-quick-avatar-input"
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleQuickAvatarChange}
      />

      <div className="gi-scroll">
        <div className="gi-inner">

          {/* ── Hero Card ──────────────────────────────────────────────── */}
          <div className="gi-hero-card">
            {editMode ? (
              <div className="gi-edit-form">
                {/* Avatar picker inside edit mode */}
                <div
                  className="gi-edit-avatar-wrap"
                  onClick={() => document.getElementById('gi-avatar-input').click()}
                >
                  <img
                    src={editPreview || groupAvatarSrc}
                    alt="group"
                    className="gi-edit-avatar-img"
                  />
                  <div className="gi-edit-avatar-overlay">
                    <Camera size={20} />
                  </div>
                  <input
                    id="gi-avatar-input"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files?.[0]; if (!f) return
                      setEditAvatar(f); setEditPreview(URL.createObjectURL(f))
                    }}
                  />
                </div>

                {/* Group name — admins only; read-only for regular members */}
                {isAdmin ? (
                  <input
                    className="gi-edit-input"
                    value={editName}
                    maxLength={60}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Group name"
                  />
                ) : (
                  <div className="gi-edit-name-readonly">
                    <span className="gi-edit-name-text">{group.name}</span>
                    <span className="gi-edit-name-hint">Only admins can change the group name</span>
                  </div>
                )}

                {/* Description — editable by all members */}
                <textarea
                  className="gi-edit-textarea"
                  value={editDesc}
                  maxLength={200}
                  rows={2}
                  onChange={e => setEditDesc(e.target.value)}
                  placeholder="Description (optional)"
                />

                <div className="gi-edit-actions">
                  <button
                    className="gi-cancel-edit-btn"
                    onClick={() => { setEditMode(false); setEditPreview(null); setEditAvatar(null) }}
                  >
                    Cancel
                  </button>
                  <button
                    className="gi-save-edit-btn"
                    onClick={handleSaveEdit}
                    disabled={editBusy}
                  >
                    {editBusy ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Clickable avatar with hover overlay → confirmation dialog */}
                <div className="gi-avatar-ring">
                  <div className="gi-hero-avatar-wrap" onClick={handleAvatarClick}>
                    <img src={groupAvatarSrc} alt={group.name} className="gi-hero-avatar" />
                    <div className="gi-hero-avatar-overlay">
                      <Camera size={16} />
                    </div>
                  </div>
                </div>

                <h2 className="gi-hero-name">{group.name}</h2>
                <p className="gi-hero-sub">
                  Group · {group.members.length} members
                  {onlineMembers > 0 && (
                    <span className="gi-online-count"> · {onlineMembers} online</span>
                  )}
                </p>

                {/* Stats */}
                <div className="gi-stats-row">
                  <StatCard icon={<Users size={16} />} label="Members" value={group.members.length} />
                  {totalMsgs !== null && (
                    <StatCard icon={<MessageSquare size={16} />} label="Messages" value={totalMsgs} />
                  )}
                  <StatCard icon={<Image size={16} />} label="Media" value={media.length} />
                  <StatCard icon={<Paperclip size={16} />} label="Docs" value={docs.length} />
                </div>

                {/* Action buttons — Edit Group visible to ALL members */}
                <div className="gi-action-row">
                  <button
                    className="gi-action-btn"
                    onClick={() => navigate(`/group/${roomId}`)}
                  >
                    <span className="gi-action-icon"><MessageCircle size={18} /></span>
                    <span className="gi-action-label">Message</span>
                  </button>

                  <button
                    className="gi-action-btn"
                    onClick={handleMute}
                    disabled={busy === 'mute'}
                  >
                    <span className={`gi-action-icon${isMuted ? ' gi-action-icon--muted' : ''}`}>
                      {isMuted ? <BellOff size={18} /> : <Bell size={18} />}
                    </span>
                    <span className="gi-action-label">{isMuted ? 'Unmute' : 'Mute'}</span>
                  </button>

                  <button
                    className="gi-action-btn"
                    onClick={() => setEditMode(true)}
                  >
                    <span className="gi-action-icon"><Pencil size={18} /></span>
                    <span className="gi-action-label">Edit Group</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ── Tab Navigation ─────────────────────────────────────────── */}
          {!editMode && (
            <div className="gi-tab-bar">
              {tabs.map(t => (
                <button
                  key={t.key}
                  className={`gi-tab-btn${activeTab === t.key ? ' active' : ''}`}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* ══ TAB: INFO ═══════════════════════════════════════════════ */}
          {activeTab === 'info' && !editMode && (
            <>
              <div className="gi-section">
                <p className="gi-section-label">About</p>

                <div className="gi-info-row">
                  <Info size={16} className="gi-info-icon" />
                  <p className="gi-info-value">{group.description || 'No group description'}</p>
                </div>

                <div className="gi-row-divider" />

                <div className="gi-info-row">
                  <User size={16} className="gi-info-icon" />
                  <div>
                    <p className="gi-info-value">{group.createdBy?.name || 'Unknown'}</p>
                    <p className="gi-info-sub">Created By</p>
                  </div>
                </div>

                <div className="gi-row-divider" />

                <div className="gi-info-row">
                  <Calendar size={16} className="gi-info-icon" />
                  <div>
                    <p className="gi-info-value">Created {formatDate(group.createdAt)}</p>
                    <p className="gi-info-sub">Group Created</p>
                  </div>
                </div>
              </div>

              {/* Danger zone */}
              <div className="gi-danger-section">
                <button
                  className="gi-danger-btn"
                  onClick={handleClearChat}
                  disabled={busy === 'clear'}
                >
                  <Trash2 size={16} className="gi-danger-icon" />
                  {busy === 'clear' ? 'Clearing...' : 'Clear Chat'}
                </button>

                <div className="gi-row-divider" />

                {!isAdmin && (
                  <>
                    <button
                      className="gi-danger-btn gi-danger-btn--error"
                      onClick={handleLeave}
                      disabled={busy === 'leave'}
                    >
                      <LogOut size={16} className="gi-danger-icon" />
                      {busy === 'leave' ? 'Leaving…' : 'Exit Group'}
                    </button>
                    <div className="gi-row-divider" />
                  </>
                )}

                <button
                  className="gi-danger-btn gi-danger-btn--error"
                  onClick={handleReport}
                  disabled={busy === 'report'}
                >
                  <Flag size={16} className="gi-danger-icon" />
                  {busy === 'report' ? 'Submitting...' : 'Report Group'}
                </button>

                {isAdmin && (
                  <>
                    <div className="gi-row-divider" />
                    <button
                      className="gi-danger-btn gi-danger-btn--error"
                      onClick={handleDeleteGroup}
                      disabled={busy === 'delete'}
                    >
                      <Trash2 size={16} className="gi-danger-icon" />
                      {busy === 'delete' ? 'Deleting…' : 'Delete Group'}
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {/* ══ TAB: MEMBERS ════════════════════════════════════════════ */}
          {activeTab === 'members' && !editMode && (
            <div className="gi-section">
              <div className="gi-section-header">
                <p className="gi-section-label">{group.members.length} Members</p>
                {isAdmin && (
                  <button
                    className="gi-invite-btn"
                    onClick={() => setShowInvite(v => !v)}
                  >
                    {showInvite ? 'Close' : '+ Invite'}
                  </button>
                )}
              </div>

              {/* Invite panel */}
              {showInvite && isAdmin && (
                <div className="gi-invite-panel">
                  <input
                    className="gi-invite-search"
                    placeholder="Search users to invite…"
                    value={inviteSearch}
                    onChange={e => setInviteSearch(e.target.value)}
                    autoFocus
                  />
                  {inviteResults.length > 0 && (
                    <div className="gi-invite-results">
                      {inviteResults.map(u => {
                        const uid = u._id || u.id
                        const sel = selectedInvite.some(x => (x._id || x.id) === uid)
                        return (
                          <div
                            key={uid}
                            className={`gi-invite-row${sel ? ' selected' : ''}`}
                            onClick={() => toggleInviteUser(u)}
                          >
                            <img
                              src={u.avatar || generateAvatar(u.name)}
                              alt={u.name}
                              className="gi-invite-avatar"
                            />
                            <div className="gi-invite-info">
                              <span className="gi-invite-name">{u.name}</span>
                              <span className="gi-invite-email">{u.email}</span>
                            </div>
                            <div className={`gi-invite-checkbox${sel ? ' checked' : ''}`}>
                              {sel && <span className="gi-invite-checkmark"><Check size={11} /></span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {inviteSearch.trim() && inviteResults.length === 0 && (
                    <p className="gi-invite-hint">No users found</p>
                  )}
                  {selectedInvite.length > 0 && (
                    <button
                      className="gi-send-invite-btn"
                      onClick={handleSendInvites}
                      disabled={inviting}
                    >
                      {inviting
                        ? 'Sending…'
                        : `Send Invite${selectedInvite.length > 1 ? 's' : ''} (${selectedInvite.length})`
                      }
                    </button>
                  )}
                </div>
              )}

              {/* Pending invitations */}
              {isAdmin && pendingInvites.length > 0 && (
                <div className="gi-pending-wrap">
                  <p className="gi-pending-label">
                    <Clock size={12} />
                    Pending Invitations ({pendingInvites.length})
                  </p>
                  {pendingInvites.map(inv => (
                    <div key={inv._id} className="gi-pending-row">
                      <img
                        src={inv.invitedUser?.avatar || generateAvatar(inv.invitedUser?.name || 'U')}
                        alt={inv.invitedUser?.name}
                        className="gi-pending-avatar"
                      />
                      <span className="gi-pending-name">{inv.invitedUser?.name}</span>
                      <button
                        className="gi-cancel-invite-btn"
                        onClick={() => handleCancelInvite(inv._id)}
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Member list */}
              {group.members.map((member, i) => {
                const mInit        = (member.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                const isMe         = member.id?.toString() === currentUser?.id?.toString()
                const memberIsAdmin = member.role === 'admin'
                const canRemove    = isAdmin && !isMe && !memberIsAdmin
                const canMakeAdmin = isAdmin && !isMe && !memberIsAdmin

                return (
                  <div key={member.id}>
                    <div className="gi-member-row">
                      <div
                        className="gi-member-avatar-wrap"
                        onClick={() => !isMe && navigate(`/user/${member.id}`)}
                      >
                        {member.avatar
                          ? <img src={member.avatar} alt={member.name} className="gi-member-avatar-img" />
                          : <div className="gi-member-avatar-initials">{mInit}</div>
                        }
                        {member.isOnline && <span className="gi-member-online-dot" />}
                      </div>

                      <div
                        className="gi-member-info"
                        onClick={() => !isMe && navigate(`/user/${member.id}`)}
                      >
                        <span className="gi-member-name">
                          {member.name}
                          {isMe && <span className="gi-member-you"> (You)</span>}
                        </span>
                        <span className={`gi-member-sub${member.isOnline && !memberIsAdmin ? ' gi-member-sub--online' : ''}`}>
                          {memberIsAdmin ? 'Group Admin' : member.isOnline ? 'Online' : 'Member'}
                        </span>
                      </div>

                      <div className="gi-member-actions">
                        {memberIsAdmin && (
                          <span className="gi-admin-badge">
                            <ShieldCheck size={12} style={{ marginRight: 3 }} />
                            Admin
                          </span>
                        )}
                        {canMakeAdmin && (
                          <button
                            className="gi-make-admin-btn"
                            onClick={() => handleMakeAdmin(member.id, member.name)}
                            title="Make Admin"
                          >
                            <ShieldCheck size={14} />
                            Make Admin
                          </button>
                        )}
                        {canRemove && (
                          <button
                            className="gi-remove-btn"
                            onClick={() => handleRemoveMember(member.id, member.name)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                    {i < group.members.length - 1 && <div className="gi-row-divider" />}
                  </div>
                )
              })}
            </div>
          )}

          {/* ══ TAB: MEDIA ══════════════════════════════════════════════ */}
          {activeTab === 'media' && !editMode && (
            <div className="gi-section">
              <p className="gi-section-label">Shared Media & Documents</p>
              <MediaGallery media={media} documents={docs} />
            </div>
          )}

        </div>
      </div>
    </div>
  )
}