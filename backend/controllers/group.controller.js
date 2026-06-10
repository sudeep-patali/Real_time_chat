const Room            = require('../models/Room')
const User            = require('../models/User')
const Message         = require('../models/Message')
const GroupInvitation = require('../models/GroupInvitation')
const { createNotification } = require('./notification.controller')

// ─── helper: assert caller is group admin ──────────────────────────────────
async function assertAdmin(roomId, userId) {
  const room = await Room.findById(roomId)
  if (!room)     throw { status: 404, message: 'Group not found' }
  if (!room.isGroup) throw { status: 400, message: 'Not a group' }
  const isCreator = room.createdBy?.toString() === userId.toString()
  const isCoAdmin = (room.adminIds || []).map(id => id.toString()).includes(userId.toString())
  if (!isCreator && !isCoAdmin)
    throw { status: 403, message: 'Only the group admin can do this' }
  return room
}

// ─── helper: check if caller is an admin (no throw) ───────────────────────
function isAdminOf(room, userId) {
  const isCreator = room.createdBy?.toString() === userId.toString()
  const isCoAdmin = (room.adminIds || []).map(id => id.toString()).includes(userId.toString())
  return isCreator || isCoAdmin
}

// ─── helper: assert caller is a member ────────────────────────────────────
async function assertMember(roomId, userId) {
  const room = await Room.findById(roomId)
  if (!room) throw { status: 404, message: 'Group not found' }
  if (!room.participantIds.map(id => id.toString()).includes(userId.toString()))
    throw { status: 403, message: 'You are not a member of this group' }
  return room
}

// ──────────────────────────────────────────────────────────────────────────
// POST /api/groups/invite
// Body: { groupId, userIds: [string] }
// ──────────────────────────────────────────────────────────────────────────
exports.inviteUsers = async (req, res, next) => {
  try {
    const { groupId, userIds } = req.body
    if (!groupId || !Array.isArray(userIds) || userIds.length === 0)
      return res.status(400).json({ message: 'groupId and userIds[] are required' })

    const room = await assertAdmin(groupId, req.user._id)

    const inviter = await User.findById(req.user._id).select('name avatar')
    const results = []

    for (const uid of userIds) {
      // Skip if already a member
      if (room.participantIds.map(id => id.toString()).includes(uid)) {
        results.push({ userId: uid, status: 'already_member' })
        continue
      }

      // Cancel any existing pending invite so we can resend
      await GroupInvitation.updateMany(
        { groupId, invitedUser: uid, status: 'pending' },
        { status: 'cancelled' }
      )

      const invitation = await GroupInvitation.create({
        groupId,
        invitedBy:   req.user._id,
        invitedUser: uid,
        status:      'pending'
      })

      await invitation.populate([
        { path: 'groupId',    select: 'groupName avatarUrl description' },
        { path: 'invitedBy',  select: 'name avatar' },
        { path: 'invitedUser', select: 'name avatar' }
      ])

      results.push({ userId: uid, status: 'invited', invitationId: invitation._id })

      // Persist notification
      await createNotification({
        userId:   uid,
        type:     'request',
        title:    inviter.name,
        body:     `invited you to join ${room.groupName}`,
        roomId:   groupId,
        senderId: req.user._id,
        avatar:   inviter.avatar
      })

      // Real-time socket event emitted by route handler after response (via req.io)
      if (req.io) {
        // Target only the invited user's socket(s) instead of broadcasting to all
        const allSockets = await req.io.fetchSockets()
        const targetSockets = allSockets.filter(
          s => s.user?._id?.toString() === uid.toString()
        )
        const invitePayload = {
          receiverId:   uid,
          invitationId: invitation._id.toString(),
          memberCount:  room.participantIds.length,
          group: {
            id:          room._id,
            name:        room.groupName,
            avatarUrl:   room.avatarUrl,
            description: room.description
          },
          invitedBy: {
            id:     inviter._id,
            name:   inviter.name,
            avatar: inviter.avatar
          }
        }
        if (targetSockets.length) {
          targetSockets.forEach(s => s.emit('group-invitation', invitePayload))
        } else {
          // User is offline – notification already persisted; no-op
        }
      }
    }

    res.status(201).json({ message: 'Invitations sent', results })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message })
    next(err)
  }
}

// ──────────────────────────────────────────────────────────────────────────
// GET /api/groups/invitations/pending
// Returns all pending invitations for the current user
// ──────────────────────────────────────────────────────────────────────────
exports.getPendingInvitations = async (req, res, next) => {
  try {
    const invitations = await GroupInvitation.find({
      invitedUser: req.user._id,
      status:      'pending'
    })
    .populate('groupId',   'groupName avatarUrl description participantIds')
    .populate('invitedBy', 'name avatar')
    .sort({ createdAt: -1 })

    const formatted = invitations.map(inv => ({
      id:          inv._id,
      group: {
        id:           inv.groupId?._id,
        name:         inv.groupId?.groupName,
        avatarUrl:    inv.groupId?.avatarUrl,
        description:  inv.groupId?.description,
        memberCount:  inv.groupId?.participantIds?.length || 0
      },
      invitedBy: {
        id:     inv.invitedBy?._id,
        name:   inv.invitedBy?.name,
        avatar: inv.invitedBy?.avatar
      },
      createdAt: inv.createdAt
    }))

    res.json({ invitations: formatted })
  } catch (err) { next(err) }
}

// ──────────────────────────────────────────────────────────────────────────
// POST /api/groups/invitation/:id/accept
// ──────────────────────────────────────────────────────────────────────────
exports.acceptInvitation = async (req, res, next) => {
  try {
    const invitation = await GroupInvitation.findById(req.params.id)
      .populate('groupId',   'groupName avatarUrl participantIds createdBy isGroup')
      .populate('invitedBy', 'name')

    if (!invitation)
      return res.status(404).json({ message: 'Invitation not found' })
    if (invitation.invitedUser.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not your invitation' })
    if (invitation.status !== 'pending')
      return res.status(400).json({ message: `Invitation already ${invitation.status}` })

    invitation.status = 'accepted'
    await invitation.save()

    // Add user to the group room
    const room = await Room.findByIdAndUpdate(
      invitation.groupId._id,
      { $addToSet: { participantIds: req.user._id } },
      { new: true }
    ).populate('participantIds', 'name avatar isOnline')

    if (req.io) {
      const allSockets   = await req.io.fetchSockets()
      const groupRoomId  = invitation.groupId._id.toString()
      const acceptingUID = req.user._id.toString()
      const inviterUID   = invitation.invitedBy._id.toString()

      // 1. Make the accepting user's socket(s) join the Socket.IO room immediately
      const acceptingSockets = allSockets.filter(
        s => s.user?._id?.toString() === acceptingUID
      )
      acceptingSockets.forEach(s => s.join(groupRoomId))

      // 2. Tell the accepting user to add the group to their sidebar
      acceptingSockets.forEach(s => s.emit('user-joined-group', {
        userId:  acceptingUID,
        groupId: groupRoomId
      }))

      // 3. Notify the inviter (targeted)
      const inviterSockets = allSockets.filter(
        s => s.user?._id?.toString() === inviterUID
      )
      inviterSockets.forEach(s => s.emit('group-invitation-accepted', {
        invitationId: invitation._id.toString(),
        groupId:      groupRoomId,
        groupName:    invitation.groupId.groupName,
        acceptedBy: { id: req.user._id, name: req.user.name },
        receiverId:   inviterUID
      }))

      // 4. Tell ALL existing group members that a new member joined
      req.io.to(groupRoomId).emit('group-member-joined', {
        groupId: groupRoomId,
        user: {
          id:     req.user._id,
          name:   req.user.name,
          avatar: req.user.avatar
        }
      })
    }

    res.json({ message: 'Invitation accepted', room })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message })
    next(err)
  }
}

// ──────────────────────────────────────────────────────────────────────────
// POST /api/groups/invitation/:id/reject
// ──────────────────────────────────────────────────────────────────────────
exports.rejectInvitation = async (req, res, next) => {
  try {
    const invitation = await GroupInvitation.findById(req.params.id)
      .populate('invitedBy', 'name')

    if (!invitation)
      return res.status(404).json({ message: 'Invitation not found' })
    if (invitation.invitedUser.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not your invitation' })
    if (invitation.status !== 'pending')
      return res.status(400).json({ message: `Invitation already ${invitation.status}` })

    invitation.status = 'rejected'
    await invitation.save()

    if (req.io) {
      const allSockets = await req.io.fetchSockets()
      const inviterUID = invitation.invitedBy._id.toString()
      const inviterSockets = allSockets.filter(
        s => s.user?._id?.toString() === inviterUID
      )
      inviterSockets.forEach(s => s.emit('group-invitation-rejected', {
        invitationId: invitation._id.toString(),
        groupId:      invitation.groupId.toString(),
        rejectedBy:   { id: req.user._id, name: req.user.name },
        receiverId:   inviterUID
      }))
    }

    res.json({ message: 'Invitation rejected' })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message })
    next(err)
  }
}

// ──────────────────────────────────────────────────────────────────────────
// POST /api/groups/:id/members
// ──────────────────────────────────────────────────────────────────────────
exports.addMember = async (req, res, next) => {
  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ message: 'userId is required' })

    const room = await assertAdmin(req.params.id, req.user._id)

    if (room.participantIds.map(id => id.toString()).includes(userId))
      return res.status(400).json({ message: 'User is already a member' })

    room.participantIds.push(userId)
    await room.save()
    await room.populate('participantIds', 'name avatar isOnline')

    res.json({ message: 'Member added', room })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message })
    next(err)
  }
}

// ──────────────────────────────────────────────────────────────────────────
// DELETE /api/groups/:id/members/:memberId
// ──────────────────────────────────────────────────────────────────────────
exports.removeMember = async (req, res, next) => {
  try {
    const room = await assertAdmin(req.params.id, req.user._id)

    const memberId = req.params.memberId
    if (isAdminOf(room, memberId))
      return res.status(400).json({ message: 'Cannot remove a group admin' })

    room.participantIds = room.participantIds.filter(id => id.toString() !== memberId)
    await room.save()

    if (req.io) {
      req.io.emit('group-member-removed', {
        groupId:          room._id.toString(),
        removedUserId:    memberId,
        removedByAdminId: req.user._id.toString()
      })
    }

    res.json({ message: 'Member removed' })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message })
    next(err)
  }
}

// ──────────────────────────────────────────────────────────────────────────
// DELETE /api/groups/:id
// ──────────────────────────────────────────────────────────────────────────
exports.deleteGroup = async (req, res, next) => {
  try {
    const room = await assertAdmin(req.params.id, req.user._id)

    await Message.deleteMany({ roomId: room._id })
    await GroupInvitation.deleteMany({ groupId: room._id })
    await room.deleteOne()

    if (req.io) {
      req.io.emit('group-deleted', { groupId: req.params.id })
    }

    res.json({ message: 'Group deleted' })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message })
    next(err)
  }
}

// ──────────────────────────────────────────────────────────────────────────
// PUT /api/groups/:id
// All members can update avatar & description; only admins can rename
// ──────────────────────────────────────────────────────────────────────────
exports.updateGroup = async (req, res, next) => {
  try {
    const room = await assertMember(req.params.id, req.user._id)
    const callerIsAdmin = isAdminOf(room, req.user._id)

    const { groupName, description } = req.body

    // Only admins can rename the group
    if (groupName !== undefined) {
      if (!callerIsAdmin)
        return res.status(403).json({ message: 'Only admins can change the group name' })
      if (groupName.trim()) room.groupName = groupName.trim()
    }

    // All members can update description and avatar
    if (description !== undefined) room.description = description.trim()
    if (req.file) {
      room.avatarUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
    }

    await room.save()
    await room.populate('participantIds', 'name avatar isOnline')

    res.json({ message: 'Group updated', room })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message })
    next(err)
  }
}

// ──────────────────────────────────────────────────────────────────────────
// POST /api/groups/:id/admins/:memberId
// Admin promotes a member to co-admin
// ──────────────────────────────────────────────────────────────────────────
exports.makeAdmin = async (req, res, next) => {
  try {
    const room = await assertAdmin(req.params.id, req.user._id)
    const memberId = req.params.memberId

    if (!room.participantIds.map(id => id.toString()).includes(memberId))
      return res.status(400).json({ message: 'User is not a member of this group' })

    if (isAdminOf(room, memberId))
      return res.status(400).json({ message: 'User is already an admin' })

    room.adminIds = [...(room.adminIds || []), memberId]
    await room.save()
    await room.populate('participantIds', 'name avatar isOnline')

    if (req.io) {
      req.io.to(req.params.id).emit('group_updated', {
        roomId:   req.params.id,
        adminIds: room.adminIds.map(id => id.toString())
      })
    }

    res.json({ message: 'Member promoted to admin', room })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message })
    next(err)
  }
}

// ──────────────────────────────────────────────────────────────────────────
// GET /api/groups/:id/invitations
// ──────────────────────────────────────────────────────────────────────────
exports.getGroupInvitations = async (req, res, next) => {
  try {
    await assertAdmin(req.params.id, req.user._id)

    const invitations = await GroupInvitation.find({
      groupId: req.params.id,
      status:  'pending'
    }).populate('invitedUser', 'name avatar isOnline')
      .sort({ createdAt: -1 })

    res.json({ invitations })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message })
    next(err)
  }
}

// ──────────────────────────────────────────────────────────────────────────
// DELETE /api/groups/:id/invitations/:invId
// ──────────────────────────────────────────────────────────────────────────
exports.cancelInvitation = async (req, res, next) => {
  try {
    await assertAdmin(req.params.id, req.user._id)

    const invitation = await GroupInvitation.findOneAndUpdate(
      { _id: req.params.invId, groupId: req.params.id, status: 'pending' },
      { status: 'cancelled' },
      { new: true }
    )
    if (!invitation) return res.status(404).json({ message: 'Invitation not found or already resolved' })

    res.json({ message: 'Invitation cancelled' })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message })
    next(err)
  }
}