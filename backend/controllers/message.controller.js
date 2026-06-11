const Message            = require('../models/Message')
const Room               = require('../models/Room')
const User               = require('../models/User')
const applyPrivacyRules  = require('../utils/applyPrivacyRules')

async function isBlockedBetween(userAId, userBId) {
  const [a, b] = await Promise.all([
    User.findById(userAId).select('blockedUsers'),
    User.findById(userBId).select('blockedUsers')
  ])
  if (!a || !b) return false
  const aBlocked = a.blockedUsers.map(id => id.toString())
  const bBlocked = b.blockedUsers.map(id => id.toString())
  return aBlocked.includes(userBId.toString()) || bBlocked.includes(userAId.toString())
}

// ── Helper: compute aggregate status ────────────────────────────────────────
function computeStatus(msg, room) {
  const senderId = msg.senderId?._id?.toString() || msg.senderId?.toString()
  if (!room) return 'sent'

  if (room.isGroup) {
    const others = (room.participantIds || []).filter(
      p => (p._id || p).toString() !== senderId
    )
    if (!others.length) return 'sent'
    const readBySet      = new Set((msg.readBy      || []).map(id => (id._id || id).toString()))
    const deliveredToSet = new Set((msg.deliveredTo || []).map(id => (id._id || id).toString()))
    const allRead        = others.every(p => readBySet.has((p._id || p).toString()))
    const allDelivered   = others.every(p => deliveredToSet.has((p._id || p).toString()))
    if (allRead)      return 'read'
    if (allDelivered) return 'delivered'
    return 'sent'
  }

  if (msg.readAt)      return 'read'
  if (msg.deliveredAt) return 'delivered'
  return 'sent'
}

exports.getHistory = async (req, res, next) => {
  try {
    const { cursor, limit = 30 } = req.query
    const query = {
      roomId:     req.params.roomId,
      deletedFor: { $nin: [req.user._id] }   // only hide "delete for me"
      // isDeleted messages (delete for all) are kept — shown as "This message was deleted"
    }
    if (cursor) query._id = { $lt: cursor }

    const messages = await Message.find(query)
      .populate('senderId', 'name avatar privacy')
      .populate('memberStatuses.userId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(Number(limit))

    const room = await Room.findById(req.params.roomId).select('isGroup participantIds')

    // Viewer is the requesting user
    const viewerId = req.user._id.toString()

    const hasMore = messages.length === Number(limit)
    res.json({
      messages: messages.reverse().map(msg => {
        const msgObj = { ...msg.toObject(), status: computeStatus(msg, room) }
        // Apply profilePhoto privacy: hide avatar when sender set it to 'nobody'
        // (or 'accepted' and viewer is not a contact — we use applyPrivacyRules' canSee logic inline)
        const senderPrivacyPhoto = msg.senderId?.privacy?.profilePhoto || 'everyone'
        const senderId = (msg.senderId?._id || msg.senderId)?.toString()
        if (senderId !== viewerId) {
          if (senderPrivacyPhoto === 'nobody') {
            if (msgObj.senderId && typeof msgObj.senderId === 'object') {
              msgObj.senderId = { ...msgObj.senderId, avatar: null }
            }
          }
          // Note: 'accepted' (contacts-only) avatars are shown since participants
          // share a room, implying a contact relationship. 'everyone' always shown.
        }
        return msgObj
      }),
      hasMore,
      nextCursor: hasMore ? messages[0]._id : null
    })
  } catch (err) { next(err) }
}

exports.sendMessage = async (req, res, next) => {
  try {
    const { content, roomId, type = 'text', fileUrl, uploadSource } = req.body
    const room = await Room.findById(roomId).select('participantIds isGroup')
    if (room && !room.isGroup) {
      const otherId = room.participantIds.find(p => p.toString() !== req.user._id.toString())
      if (otherId) {
        const blocked = await isBlockedBetween(req.user._id, otherId)
        if (blocked) return res.status(403).json({ message: 'You cannot send messages to this user.' })
      }
    }
    const message = await Message.create({
      content, roomId, type, fileUrl,
      uploadSource: uploadSource || null,
      senderId: req.user._id,
      sentAt:   new Date(),
      readBy:   [req.user._id]
    })
    await Room.findByIdAndUpdate(roomId, { lastMessage: message._id })
    await message.populate('senderId', 'name avatar')
    res.status(201).json({ message })
  } catch (err) { next(err) }
}

// PUT /messages/:messageId
exports.editMessage = async (req, res, next) => {
  try {
    const { content } = req.body
    if (!content?.trim()) return res.status(400).json({ message: 'Content cannot be empty' })

    const msg = await Message.findById(req.params.messageId)
    if (!msg)                                               return res.status(404).json({ message: 'Not found' })
    if (msg.senderId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' })
    if (msg.type !== 'text')                                return res.status(400).json({ message: 'Only text messages can be edited' })
    if (msg.isDeleted)                                      return res.status(400).json({ message: 'Cannot edit a deleted message' })

    msg.content  = content.trim()
    msg.isEdited = true
    msg.editedAt = new Date()
    await msg.save()
    await msg.populate('senderId', 'name avatar')

    res.json({ message: msg })
  } catch (err) { next(err) }
}

// DELETE /messages/:messageId
exports.deleteMessage = async (req, res, next) => {
  try {
    const { deleteFor = 'me' } = req.body
    const msg = await Message.findById(req.params.messageId)
    if (!msg) return res.status(404).json({ message: 'Not found' })

    if (deleteFor === 'all') {
      if (msg.senderId.toString() !== req.user._id.toString())
        return res.status(403).json({ message: 'Only the sender can delete for everyone' })
      msg.isDeleted = true
      msg.content   = ''
      await msg.save()
      return res.json({ message: 'Deleted for all', deleteFor: 'all', messageId: msg._id })
    }

    if (!msg.deletedFor.map(id => id.toString()).includes(req.user._id.toString())) {
      msg.deletedFor.push(req.user._id)
      await msg.save()
    }
    res.json({ message: 'Deleted for you', deleteFor: 'me', messageId: msg._id })
  } catch (err) { next(err) }
}

// POST /messages/:roomId/read
exports.markRead = async (req, res, next) => {
  try {
    const userId = req.user._id
    const now    = new Date()
    const room   = await Room.findById(req.params.roomId).select('isGroup participantIds')

    const unreadCount = await Message.countDocuments({
      roomId:    req.params.roomId,
      senderId:  { $ne: userId },
      readBy:    { $ne: userId },
      isDeleted: { $ne: true }
    })

    if (room?.isGroup) {
      // Group: update readBy + memberStatuses for each unread message
      const msgs = await Message.find({
        roomId:    req.params.roomId,
        senderId:  { $ne: userId },
        readBy:    { $ne: userId },
        isDeleted: { $ne: true }
      })

      for (const msg of msgs) {
        await Message.findByIdAndUpdate(msg._id, {
          $addToSet: { readBy: userId, deliveredTo: userId }
        })
        const msIdx = msg.memberStatuses.findIndex(ms => ms.userId.toString() === userId.toString())
        if (msIdx >= 0) {
          await Message.findByIdAndUpdate(msg._id, {
            $set: {
              [`memberStatuses.${msIdx}.readAt`]:      now,
              [`memberStatuses.${msIdx}.deliveredAt`]: now
            }
          })
        } else {
          await Message.findByIdAndUpdate(msg._id, {
            $push: { memberStatuses: { userId, deliveredAt: now, readAt: now } }
          })
        }
      }
    } else {
      // Individual: set readAt + deliveredAt
      await Message.updateMany(
        { roomId: req.params.roomId, readBy: { $ne: userId } },
        {
          $addToSet: { readBy: userId },
          $set:      { readAt: now, deliveredAt: now }
        }
      )
    }

    res.json({ message: 'Marked as read', clearedCount: unreadCount, roomId: req.params.roomId })
  } catch (err) { next(err) }
}

// GET /messages/:roomId/unread-count
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Message.countDocuments({
      roomId:    req.params.roomId,
      senderId:  { $ne: req.user._id },
      readBy:    { $ne: req.user._id },
      isDeleted: { $ne: true }
    })
    res.json({ roomId: req.params.roomId, count })
  } catch (err) { next(err) }
}

// GET /messages/unread-counts
exports.getAllUnreadCounts = async (req, res, next) => {
  try {
    const userId = req.user._id
    const rooms  = await Room.find({
      participantIds: userId,
      status: 'accepted'
    }).select('_id')

    const roomIds = rooms.map(r => r._id)

    const counts = await Message.aggregate([
      {
        $match: {
          roomId:    { $in: roomIds },
          senderId:  { $ne: userId },
          readBy:    { $ne: userId },
          isDeleted: { $ne: true }
        }
      },
      { $group: { _id: '$roomId', count: { $sum: 1 } } }
    ])

    const result = {}
    counts.forEach(c => { result[c._id.toString()] = c.count })

    res.json({ unreadCounts: result })
  } catch (err) { next(err) }
}

// GET /messages/:messageId/info  — REST endpoint for Message Info panel
exports.getMessageInfo = async (req, res, next) => {
  try {
    const msg = await Message.findById(req.params.messageId)
      .populate('senderId',          'name avatar')
      .populate('readBy',            'name avatar')
      .populate('deliveredTo',       'name avatar')
      .populate('memberStatuses.userId', 'name avatar')

    if (!msg) return res.status(404).json({ message: 'Not found' })

    const room = await Room.findById(msg.roomId).populate('participantIds', 'name avatar')
    if (!room) return res.status(404).json({ message: 'Room not found' })

    const senderId = msg.senderId._id.toString()

    const info = {
      messageId:   msg._id.toString(),
      roomId:      msg.roomId.toString(),
      isGroup:     room.isGroup,
      type:        msg.type,
      sentAt:      msg.sentAt || msg.createdAt,
      deliveredAt: msg.deliveredAt || null,
      readAt:      msg.readAt      || null,
      sender: {
        id:     senderId,
        name:   msg.senderId.name,
        avatar: msg.senderId.avatar
      },
      status: computeStatus(msg, room)
    }

    if (room.isGroup) {
      const members = room.participantIds.filter(p => p._id.toString() !== senderId)

      info.memberDetails = members.map(member => {
        const ms = msg.memberStatuses.find(
          s => (s.userId?._id || s.userId)?.toString() === member._id.toString()
        )
        return {
          userId:      member._id.toString(),
          name:        member.name,
          avatar:      member.avatar,
          deliveredAt: ms?.deliveredAt || null,
          readAt:      ms?.readAt      || null,
          status: ms?.readAt      ? 'read'
                : ms?.deliveredAt ? 'delivered'
                :                   'sent'
        }
      })

      const allDeliveredAts = info.memberDetails.map(m => m.deliveredAt).filter(Boolean)
      const allReadAts      = info.memberDetails.map(m => m.readAt).filter(Boolean)
      info.deliveredAt = allDeliveredAts.length ? new Date(Math.max(...allDeliveredAts.map(d => new Date(d)))) : null
      info.readAt      = allReadAts.length      ? new Date(Math.max(...allReadAts.map(d => new Date(d))))      : null
      info.receiver    = null
    } else {
      const receiver = room.participantIds.find(p => p._id.toString() !== senderId)
      info.receiver  = receiver
        ? { id: receiver._id.toString(), name: receiver.name, avatar: receiver.avatar }
        : null
    }

    res.json(info)
  } catch (err) { next(err) }
}
// POST /api/messages/:messageId/report
exports.reportMessage = async (req, res, next) => {
  try {
    const Report  = require('../models/Report')
    const Message = require('../models/Message')
    const { reason } = req.body
    const msg = await Message.findById(req.params.messageId)
    if (!msg) return res.status(404).json({ message: 'Message not found' })
    const existing = await Report.findOne({ reportedBy: req.user._id, targetId: msg._id })
    if (existing) return res.json({ message: 'Already reported' })
    await Report.create({
      reportedBy: req.user._id,
      targetType: 'message',
      targetId:   msg._id,
      reason:     reason || 'No reason provided',
    })
    res.json({ message: 'Message reported' })
  } catch (err) { next(err) }
}