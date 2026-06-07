import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import * as roomService  from '../services/roomService'
import * as groupService from '../services/groupService'
import * as userService  from '../services/userService'
import MediaGallery from '../components/MediaGallery'
import { generateAvatar } from '../utils/generateAvatar'
import '../styles/chat.css'

// ─── small debounce hook ──────────────────────────────────────────────────────
function useDebounce(value, delay = 350) {
  const [d, setD] = useState(value)
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t) }, [value, delay])
  return d
}

export default function GroupInfo() {
  const { roomId }     = useParams()
  const navigate       = useNavigate()
  const rooms          = useChatStore(state => state.rooms)
  const setMessages    = useChatStore(state => state.setMessages)
  const removeRoom     = useChatStore(state => state.removeRoom)
  const updateRoom     = useChatStore(state => state.updateRoom)
  const toggleMuteRoom = useChatStore(state => state.toggleMuteRoom)
  const currentUser    = useAuthStore(state => state.currentUser)

  const [group,        setGroup]        = useState(null)
  const [media,        setMedia]        = useState([])
  const [docs,         setDocs]         = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [busy,         setBusy]         = useState('')

  // Edit mode
  const [editMode,     setEditMode]     = useState(false)
  const [editName,     setEditName]     = useState('')
  const [editDesc,     setEditDesc]     = useState('')
  const [editAvatar,   setEditAvatar]   = useState(null)
  const [editPreview,  setEditPreview]  = useState(null)
  const [editBusy,     setEditBusy]     = useState(false)

  // Invite panel
  const [showInvite,   setShowInvite]   = useState(false)
  const [inviteSearch, setInviteSearch] = useState('')
  const [inviteResults,setInviteResults]= useState([])
  const [inviteSearch_,]= [useDebounce(inviteSearch)]
  const debouncedInvite = useDebounce(inviteSearch)
  const [selectedInvite,setSelectedInvite] = useState([])
  const [inviting,     setInviting]     = useState(false)
  const [pendingInvites,setPendingInvites]= useState([])

  const liveRoom = rooms.find(r => (r._id || r.id) === roomId)
  const isMuted  = liveRoom?.isMuted || false

  // ── Load group ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return
    setLoading(true)
    roomService.getRoomById(roomId)
      .then(res => {
        const room = res.data.room
        const g = {
          id:          room._id || room.id,
          name:        room.groupName || 'Group',
          description: room.description || '',
          createdAt:   room.createdAt,
          createdBy:   room.createdBy,
          avatarUrl:   room.avatarUrl || null,
          members:     (room.participantIds || []).map(p => ({
            id:       p._id || p.id,
            name:     p.name || 'Unknown',
            avatar:   p.avatar || null,
            isOnline: p.isOnline || false,
            role:     room.createdBy?._id === (p._id || p.id) ? 'admin' : 'member'
          }))
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

  // Load pending invites for admin
  const loadPendingInvites = useCallback(() => {
    if (!group || !isAdmin) return
    groupService.getGroupInvitations(group.id)
      .then(res => setPendingInvites(res.data.invitations || []))
      .catch(() => {})
  }, [group])

  useEffect(() => { loadPendingInvites() }, [loadPendingInvites])

  // ── Invite search ─────────────────────────────────────────────────────────
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

  // ── Derived: is current user the admin ────────────────────────────────────
  const isAdmin = group?.createdBy?._id === currentUser?.id ||
                  group?.createdBy?.toString() === currentUser?.id?.toString()

  // ── Handlers ──────────────────────────────────────────────────────────────
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
    if (!window.confirm('Permanently delete this group and all its messages? This cannot be undone.')) return
    setBusy('delete')
    try {
      await groupService.deleteGroup(group.id)
      removeRoom(group.id)
      navigate('/', { replace: true })
    } catch { alert('Failed to delete group.') }
    finally { setBusy('') }
  }

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from the group?`)) return
    try {
      await groupService.removeMember(group.id, memberId)
      setGroup(g => ({ ...g, members: g.members.filter(m => m.id !== memberId) }))
    } catch (err) { alert(err.response?.data?.message || 'Failed to remove member.') }
  }

  const handleSaveEdit = async () => {
    setEditBusy(true)
    try {
      const res = await groupService.updateGroup(group.id, {
        groupName:   editName.trim(),
        description: editDesc.trim(),
        avatar:      editAvatar
      })
      const updated = res.data.room
      setGroup(g => ({ ...g, name: updated.groupName, description: updated.description || '', avatarUrl: updated.avatarUrl || g.avatarUrl }))
      updateRoom(roomId, { groupName: updated.groupName, description: updated.description, avatarUrl: updated.avatarUrl })
      setEditMode(false)
    } catch { alert('Failed to update group info.') }
    finally { setEditBusy(false) }
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
      const userIds = selectedInvite.map(u => u._id || u.id)
      await groupService.inviteUsers(group.id, userIds)
      setSelectedInvite([])
      setInviteSearch('')
      setInviteResults([])
      setShowInvite(false)
      loadPendingInvites()
      alert(`Invitation${userIds.length > 1 ? 's' : ''} sent!`)
    } catch (err) { alert(err.response?.data?.message || 'Failed to send invitations.') }
    finally { setInviting(false) }
  }

  const handleCancelInvite = async (invId) => {
    try {
      await groupService.cancelInvitation(group.id, invId)
      setPendingInvites(prev => prev.filter(i => i._id !== invId))
    } catch { alert('Failed to cancel invitation.') }
  }

  // ── Loading / error ────────────────────────────────────────────────────────
  const TopBar = () => (
    <div style={s.topBar}>
      <button style={s.backBtn} onClick={() => navigate(-1)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <span style={s.topBarTitle}>Group Info</span>
    </div>
  )

  if (loading) return (
    <div style={s.page}><TopBar />
      <div style={s.centeredPage}><div style={s.spinner} /><p style={s.loadingText}>Loading…</p></div>
    </div>
  )
  if (error || !group) return (
    <div style={s.page}><TopBar />
      <div style={s.centeredPage}><p style={{ color: 'var(--color-error)', fontSize: 14 }}>{error || 'Group not found.'}</p></div>
    </div>
  )

  const groupAvatarSrc = group.avatarUrl || generateAvatar(group.name)
  const formatDate = iso => iso
    ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  return (
    <div style={s.page}>
      <TopBar />

      <div style={s.scroll}>
        <div style={s.inner}>

          {/* ── Hero card ──────────────────────────────────────────────────── */}
          <div style={s.heroCard}>
            {editMode ? (
              /* edit state */
              <div style={s.editForm}>
                <div style={s.editAvatarWrap} onClick={() => document.getElementById('gi-avatar-input').click()}>
                  <img src={editPreview || groupAvatarSrc} alt="group" style={s.editAvatarImg} />
                  <div style={s.editAvatarOverlay}>📷</div>
                  <input id="gi-avatar-input" type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files?.[0]; if (!f) return
                      setEditAvatar(f); setEditPreview(URL.createObjectURL(f))
                    }} />
                </div>
                <input style={s.editInput} value={editName} maxLength={60}
                  onChange={e => setEditName(e.target.value)} placeholder="Group name" />
                <textarea style={s.editTextarea} value={editDesc} maxLength={200} rows={2}
                  onChange={e => setEditDesc(e.target.value)} placeholder="Description (optional)" />
                <div style={s.editActions}>
                  <button style={s.cancelEditBtn} onClick={() => { setEditMode(false); setEditPreview(null); setEditAvatar(null) }}>Cancel</button>
                  <button style={{ ...s.saveEditBtn, opacity: editBusy ? 0.5 : 1 }} onClick={handleSaveEdit} disabled={editBusy}>
                    {editBusy ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              /* view state */
              <>
                <div style={s.avatarRing}>
                  <img src={groupAvatarSrc} alt={group.name} style={s.heroAvatar} />
                </div>
                <div style={s.heroText}>
                  <h2 style={s.heroName}>{group.name}</h2>
                  <p style={s.heroSub}>Group · {group.members.length} members</p>
                </div>

                <div style={s.actionRow}>
                  <button style={s.actionBtn} onClick={() => navigate(`/group/${roomId}`)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <span style={s.actionLabel}>Message</span>
                  </button>
                  <button style={{ ...s.actionBtn, opacity: busy === 'mute' ? 0.5 : 1 }}
                    onClick={handleMute} disabled={busy === 'mute'}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke={isMuted ? '#f59e0b' : 'var(--color-primary)'}
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                      {isMuted && <line x1="1" y1="1" x2="23" y2="23"/>}
                    </svg>
                    <span style={s.actionLabel}>{isMuted ? 'Unmute' : 'Mute'}</span>
                  </button>
                  {isAdmin && (
                    <button style={s.actionBtn} onClick={() => setEditMode(true)}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      <span style={s.actionLabel}>Edit</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── About ──────────────────────────────────────────────────────── */}
          {!editMode && (
            <div style={s.section}>
              <p style={s.sectionLabel}>About</p>
              <div style={s.infoRow}>
                <svg style={s.infoIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p style={s.infoValue}>{group.description || 'No group description'}</p>
              </div>
              <div style={s.rowDivider} />
              <div style={s.infoRow}>
                <svg style={s.infoIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <div>
                  <p style={s.infoValue}>Created {formatDate(group.createdAt)}</p>
                  <p style={s.infoSub}>Group created</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Members ────────────────────────────────────────────────────── */}
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <p style={s.sectionLabel}>{group.members.length} Members</p>
              {isAdmin && (
                <button style={s.inviteBtn} onClick={() => setShowInvite(v => !v)}>
                  {showInvite ? '✕ Close' : '+ Invite'}
                </button>
              )}
            </div>

            {/* Invite panel */}
            {showInvite && isAdmin && (
              <div style={s.invitePanel}>
                <input
                  style={s.inviteSearchInput}
                  placeholder="Search users to invite…"
                  value={inviteSearch}
                  onChange={e => setInviteSearch(e.target.value)}
                  autoFocus
                />
                {inviteResults.length > 0 && (
                  <div style={s.inviteResults}>
                    {inviteResults.map(u => {
                      const uid = u._id || u.id
                      const sel = selectedInvite.some(x => (x._id || x.id) === uid)
                      return (
                        <div key={uid} style={{ ...s.inviteRow, background: sel ? 'var(--color-primary-light)' : 'transparent' }}
                          onClick={() => toggleInviteUser(u)}>
                          <img src={u.avatar || generateAvatar(u.name)} alt={u.name} style={s.inviteAvatar} />
                          <div style={s.inviteInfo}>
                            <span style={s.inviteName}>{u.name}</span>
                            <span style={s.inviteEmail}>{u.email}</span>
                          </div>
                          <div style={{ ...s.checkbox, ...(sel ? s.checkboxChecked : {}) }}>
                            {sel && <span style={s.checkmark}>✓</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {inviteSearch.trim() && inviteResults.length === 0 && (
                  <p style={s.inviteHint}>No users found</p>
                )}
                {selectedInvite.length > 0 && (
                  <button
                    style={{ ...s.sendInviteBtn, opacity: inviting ? 0.5 : 1 }}
                    onClick={handleSendInvites}
                    disabled={inviting}
                  >
                    {inviting ? 'Sending…' : `Send Invite${selectedInvite.length > 1 ? 's' : ''} (${selectedInvite.length})`}
                  </button>
                )}
              </div>
            )}

            {/* Pending invitations (admin only) */}
            {isAdmin && pendingInvites.length > 0 && (
              <div style={s.pendingWrap}>
                <p style={s.pendingLabel}>⏳ Pending Invitations ({pendingInvites.length})</p>
                {pendingInvites.map(inv => (
                  <div key={inv._id} style={s.pendingRow}>
                    <img src={inv.invitedUser?.avatar || generateAvatar(inv.invitedUser?.name || 'U')}
                      alt={inv.invitedUser?.name} style={s.pendingAvatar} />
                    <span style={s.pendingName}>{inv.invitedUser?.name}</span>
                    <button style={s.cancelInviteBtn} onClick={() => handleCancelInvite(inv._id)}>
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Member list */}
            {group.members.map((member, i) => {
              const mInit = (member.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
              const isMe  = member.id?.toString() === currentUser?.id?.toString()
              const canRemove = isAdmin && !isMe && member.role !== 'admin'
              return (
                <div key={member.id}>
                  <div style={s.memberRow}>
                    <div style={s.memberAvatarWrap} onClick={() => !isMe && navigate(`/user/${member.id}`)}>
                      {member.avatar
                        ? <img src={member.avatar} alt={member.name} style={s.memberAvatarImg} />
                        : <div style={s.memberAvatar}>{mInit}</div>
                      }
                      {member.isOnline && <span style={s.onlineDot} />}
                    </div>
                    <div style={s.memberInfo} onClick={() => !isMe && navigate(`/user/${member.id}`)}>
                      <span style={s.memberName}>
                        {member.name}{isMe && <span style={s.youLabel}> (You)</span>}
                      </span>
                      <span style={s.memberSub}>{member.role === 'admin' ? 'Group Admin' : 'Member'}</span>
                    </div>
                    {member.role === 'admin' && <span style={s.adminBadge}>Admin</span>}
                    {canRemove && (
                      <button style={s.removeMemberBtn}
                        onClick={() => handleRemoveMember(member.id, member.name)}>
                        Remove
                      </button>
                    )}
                  </div>
                  {i < group.members.length - 1 && <div style={s.rowDivider} />}
                </div>
              )
            })}
          </div>

          {/* ── Shared Media ──────────────────────────────────────────────── */}
          <div style={s.section}>
            <p style={s.sectionLabel}>Shared Media & Documents</p>
            <MediaGallery media={media} documents={docs} />
          </div>

          {/* ── Danger zone ────────────────────────────────────────────────── */}
          <div style={s.dangerSection}>
            <button style={{ ...s.dangerBtn, color: 'var(--color-text-muted)', opacity: busy === 'clear' ? 0.5 : 1 }}
              onClick={handleClearChat} disabled={busy === 'clear'}>
              <span style={s.dangerIcon}>🗑</span>
              {busy === 'clear' ? 'Clearing...' : 'Clear Chat'}
            </button>
            <div style={s.rowDivider} />
            {!isAdmin && (
              <>
                <button style={{ ...s.dangerBtn, color: 'var(--color-error)', opacity: busy === 'leave' ? 0.5 : 1 }}
                  onClick={handleLeave} disabled={busy === 'leave'}>
                  <span style={s.dangerIcon}>🚪</span>
                  {busy === 'leave' ? 'Leaving…' : 'Exit Group'}
                </button>
                <div style={s.rowDivider} />
              </>
            )}
            <button style={{ ...s.dangerBtn, color: 'var(--color-error)', opacity: busy === 'report' ? 0.5 : 1 }}
              onClick={handleReport} disabled={busy === 'report'}>
              <span style={s.dangerIcon}>⚠️</span>
              {busy === 'report' ? 'Submitting...' : 'Report Group'}
            </button>
            {isAdmin && (
              <>
                <div style={s.rowDivider} />
                <button style={{ ...s.dangerBtn, color: 'var(--color-error)', opacity: busy === 'delete' ? 0.5 : 1 }}
                  onClick={handleDeleteGroup} disabled={busy === 'delete'}>
                  <span style={s.dangerIcon}>🗑</span>
                  {busy === 'delete' ? 'Deleting…' : 'Delete Group'}
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

const s = {
  page:         { height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)', overflow: 'hidden' },
  topBar:       { display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', height: 59, minHeight: 59, backgroundColor: 'var(--color-header-bg)', borderBottom: '1px solid var(--color-border)', flexShrink: 0 },
  backBtn:      { background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  topBarTitle:  { fontSize: 16, fontWeight: 600, color: 'var(--color-text)' },
  scroll:       { flex: 1, overflowY: 'auto', backgroundColor: 'var(--color-bg)' },
  inner:        { maxWidth: 680, margin: '0 auto', padding: '24px 16px 48px', display: 'flex', flexDirection: 'column', gap: 12 },
  centeredPage: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 },
  spinner:      { width: 28, height: 28, border: '2px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  loadingText:  { fontSize: 13, color: 'var(--color-text-muted)' },

  // Hero
  heroCard:     { backgroundColor: 'var(--color-surface)', borderRadius: 12, padding: '28px 24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, border: '1px solid var(--color-border)' },
  avatarRing:   { width: 96, height: 96, borderRadius: '50%', border: '3px solid rgba(124,110,247,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  heroAvatar:   { width: 84, height: 84, borderRadius: '50%', objectFit: 'cover' },
  heroText:     { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  heroName:     { fontSize: 20, fontWeight: 700, color: 'var(--color-text)' },
  heroSub:      { fontSize: 13, color: 'var(--color-text-muted)' },
  actionRow:    { display: 'flex', gap: 8, marginTop: 8, width: '100%', justifyContent: 'center' },
  actionBtn:    { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', cursor: 'pointer', padding: '10px 20px', borderRadius: 10, flex: 1, maxWidth: 110 },
  actionLabel:  { fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500, whiteSpace: 'nowrap' },

  // Edit form
  editForm:         { width: '100%', display: 'flex', flexDirection: 'column', gap: 12 },
  editAvatarWrap:   { position: 'relative', width: 80, height: 80, margin: '0 auto', cursor: 'pointer', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--color-primary)' },
  editAvatarImg:    { width: '100%', height: '100%', objectFit: 'cover' },
  editAvatarOverlay:{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 },
  editInput:        { backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text)', fontSize: 14, padding: '10px 12px', outline: 'none', width: '100%' },
  editTextarea:     { backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text)', fontSize: 14, padding: '10px 12px', outline: 'none', width: '100%', resize: 'none', fontFamily: 'inherit' },
  editActions:      { display: 'flex', gap: 10, justifyContent: 'flex-end' },
  cancelEditBtn:    { padding: '8px 18px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)', fontSize: 13, cursor: 'pointer' },
  saveEditBtn:      { padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },

  // Section
  section:      { backgroundColor: 'var(--color-surface)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 10 },
  sectionHeader:{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { fontSize: 10, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 2 },
  infoRow:      { display: 'flex', alignItems: 'flex-start', gap: 14 },
  infoIcon:     { color: 'var(--color-text-dim)', flexShrink: 0, marginTop: 2 },
  infoValue:    { fontSize: 14, color: 'var(--color-text)', fontWeight: 500, lineHeight: 1.4 },
  infoSub:      { fontSize: 11, color: 'var(--color-text-dim)', marginTop: 2 },
  rowDivider:   { height: 1, background: 'var(--color-divider)', margin: '4px 0' },

  // Invite panel
  inviteBtn:        { fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)', borderRadius: 20, padding: '4px 14px', cursor: 'pointer' },
  invitePanel:      { backgroundColor: 'var(--color-surface-2)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid var(--color-border)' },
  inviteSearchInput:{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text)', fontSize: 13, padding: '8px 12px', outline: 'none', width: '100%' },
  inviteResults:    { maxHeight: 200, overflowY: 'auto', borderRadius: 8, border: '1px solid var(--color-border)' },
  inviteRow:        { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', cursor: 'pointer', transition: 'background 0.12s' },
  inviteAvatar:     { width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  inviteInfo:       { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
  inviteName:       { fontSize: 13, fontWeight: 600, color: 'var(--color-text)' },
  inviteEmail:      { fontSize: 11, color: 'var(--color-text-dim)' },
  inviteHint:       { fontSize: 12, color: 'var(--color-text-dim)', textAlign: 'center', padding: '6px 0' },
  sendInviteBtn:    { width: '100%', padding: '9px 0', borderRadius: 8, border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  checkbox:         { width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkboxChecked:  { backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)' },
  checkmark:        { color: '#fff', fontSize: 11, fontWeight: 700 },

  // Pending invites
  pendingWrap:  { backgroundColor: 'rgba(124,110,247,0.06)', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 },
  pendingLabel: { fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 2 },
  pendingRow:   { display: 'flex', alignItems: 'center', gap: 10 },
  pendingAvatar:{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  pendingName:  { flex: 1, fontSize: 13, color: 'var(--color-text)', fontWeight: 500 },
  cancelInviteBtn: { fontSize: 11, fontWeight: 600, color: 'var(--color-error)', background: 'transparent', border: '1px solid var(--color-error)', borderRadius: 12, padding: '3px 10px', cursor: 'pointer' },

  // Members
  memberRow:        { display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' },
  memberAvatarWrap: { position: 'relative', flexShrink: 0, cursor: 'pointer' },
  memberAvatar:     { width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#9c8ef7,#7c6ef7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 },
  memberAvatarImg:  { width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' },
  onlineDot:        { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--color-online)', border: '2px solid var(--color-surface)' },
  memberInfo:       { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, cursor: 'pointer' },
  memberName:       { fontSize: 14, fontWeight: 500, color: 'var(--color-text)' },
  youLabel:         { fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 400 },
  memberSub:        { fontSize: 11, color: 'var(--color-text-dim)' },
  adminBadge:       { fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', flexShrink: 0 },
  removeMemberBtn:  { fontSize: 11, fontWeight: 600, color: 'var(--color-error)', background: 'transparent', border: '1px solid var(--color-error)', borderRadius: 12, padding: '3px 10px', cursor: 'pointer', flexShrink: 0 },

  // Danger
  dangerSection:{ backgroundColor: 'var(--color-surface)', borderRadius: 12, padding: '4px 20px', border: '1px solid var(--color-border)' },
  dangerBtn:    { display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: 'none', border: 'none', padding: '13px 0', fontSize: 14, cursor: 'pointer', fontWeight: 500, textAlign: 'left' },
  dangerIcon:   { fontSize: 16 },
}