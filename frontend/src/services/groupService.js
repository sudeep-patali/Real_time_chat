import api from '../config/api.config'

// ── Group creation ────────────────────────────────────────────────────────────
export const createGroup = ({ groupName, description = '', memberIds, avatar = null }) => {
  const form = new FormData()
  form.append('groupName',   groupName)
  form.append('description', description)
  memberIds.forEach(id => form.append('memberIds', id))
  if (avatar) form.append('avatar', avatar)
  return api.post('/groups/create', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// ── Group info / updates ──────────────────────────────────────────────────────
export const getGroupById     = (roomId)         => api.get(`/rooms/${roomId}`)
export const updateGroup      = (groupId, { groupName, description, avatar }) => {
  const form = new FormData()
  if (groupName)    form.append('groupName',   groupName)
  if (description !== undefined) form.append('description', description)
  if (avatar)       form.append('avatar', avatar)
  return api.put(`/groups/${groupId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
export const deleteGroup      = (groupId)         => api.delete(`/groups/${groupId}`)

// ── Invitation flow ───────────────────────────────────────────────────────────
export const inviteUsers           = (groupId, userIds)  => api.post('/groups/invite', { groupId, userIds })
export const getPendingInvitations = ()                  => api.get('/groups/invitations/pending')
export const acceptInvitation      = (invitationId)      => api.post(`/groups/invitation/${invitationId}/accept`)
export const rejectInvitation      = (invitationId)      => api.post(`/groups/invitation/${invitationId}/reject`)

// ── Admin: member management ──────────────────────────────────────────────────
export const addMember         = (groupId, userId)       => api.post(`/groups/${groupId}/members`, { userId })
export const removeMember      = (groupId, userId)       => api.delete(`/groups/${groupId}/members/${userId}`)
export const exitGroup         = (roomId)                => api.post(`/rooms/${roomId}/leave`)

// ── Admin: invitation management ─────────────────────────────────────────────
export const getGroupInvitations = (groupId)             => api.get(`/groups/${groupId}/invitations`)
export const cancelInvitation    = (groupId, invId)      => api.delete(`/groups/${groupId}/invitations/${invId}`)