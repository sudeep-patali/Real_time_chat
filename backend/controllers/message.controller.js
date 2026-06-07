const Message = require('../models/Message')
const Room    = require('../models/Room')
const User    = require('../models/User')

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

exports.getHistory = async (req, res, next) => {
  try {
    const { cursor, limit = 30 } = req.query
    const query = {
      roomId:    req.params.roomId,
      isDeleted: { $ne: true },
      deletedFor: { $nin: [req.user._id] }
    }
    if (cursor) query._id = { $lt: cursor }

    const messages = await Message.find(query)
      .populate('senderId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(Number(limit))

    const hasMore = messages.length === Number(limit)
    res.json({
      messages: messages.reverse(),
      hasMore,
      nextCursor: hasMore ? messages[0]._id : null
    })
  } catch (err) { next(err) }
}

exports.sendMessage = async (req, res, next) => {
  try {
    const { content, roomId, type = 'text', fileUrl } = req.body
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
      senderId: req.user._id,
      readBy: [req.user._id]   // sender has already "read" their own message
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

// DELETE /messages/:messageId  — body: { deleteFor: 'me' | 'all' }
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
// Marks all messages in the room as read by the current user.
// Returns the exact count of messages that were newly marked (were unread).
// The socket handler uses this count to emit an accurate unread_cleared event.
exports.markRead = async (req, res, next) => {
  try {
    const userId = req.user._id

    // Count how many messages are genuinely unread by this user (excluding their own)
    const unreadCount = await Message.countDocuments({
      roomId:    req.params.roomId,
      senderId:  { $ne: userId },          // ignore messages the user sent themselves
      readBy:    { $ne: userId },
      isDeleted: { $ne: true }
    })

    // Mark them all read
    await Message.updateMany(
      { roomId: req.params.roomId, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    )

    res.json({ message: 'Marked as read', clearedCount: unreadCount, roomId: req.params.roomId })
  } catch (err) { next(err) }
}

// GET /messages/:roomId/unread-count
// Returns the precise unread count for a single room for the current user.
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

// GET /messages/unread-counts  — bulk unread counts for all rooms the user is in
exports.getAllUnreadCounts = async (req, res, next) => {
  try {
    const userId = req.user._id

    // Find all accepted rooms this user belongs to
    const rooms = await Room.find({
      participantIds: userId,
      status: 'accepted'
    }).select('_id')

    const roomIds = rooms.map(r => r._id)

    // Aggregate unread counts per room in a single DB query
    const counts = await Message.aggregate([
      {
        $match: {
          roomId:    { $in: roomIds },
          senderId:  { $ne: userId },
          readBy:    { $ne: userId },
          isDeleted: { $ne: true }
        }
      },
      {
        $group: {
          _id:   '$roomId',
          count: { $sum: 1 }
        }
      }
    ])

    // Build { roomId: count } map
    const result = {}
    counts.forEach(c => {
      result[c._id.toString()] = c.count
    })

    res.json({ unreadCounts: result })
  } catch (err) { next(err) }
}