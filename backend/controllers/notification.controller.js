const Notification = require('../models/Notification')

// GET /api/notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('senderId', 'name avatar')

    const formatted = notifications.map(n => ({
      id:        n._id,
      type:      n.type,
      title:     n.title,
      body:      n.body,
      roomId:    n.roomId,
      senderId:  n.senderId?._id || n.senderId,
      avatar:    n.senderId?.avatar || n.avatar,
      isRead:    n.isRead,
      read:      n.isRead,
      timestamp: n.createdAt
    }))

    res.json({ notifications: formatted })
  } catch (err) { next(err) }
}

// PATCH /api/notifications/read-all
exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    )
    res.json({ message: 'All notifications marked as read' })
  } catch (err) { next(err) }
}

// PATCH /api/notifications/:id/read
exports.markOneRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true }
    )
    res.json({ message: 'Notification marked as read' })
  } catch (err) { next(err) }
}

// DELETE /api/notifications
exports.clearAll = async (req, res, next) => {
  try {
    await Notification.deleteMany({ userId: req.user._id })
    res.json({ message: 'All notifications cleared' })
  } catch (err) { next(err) }
}

// Internal helper — called from socket handler
exports.createNotification = async ({ userId, type, title, body, roomId, senderId, avatar }) => {
  try {
    const n = await Notification.create({ userId, type, title, body, roomId, senderId, avatar })
    return {
      id:        n._id,
      type:      n.type,
      title:     n.title,
      body:      n.body,
      roomId:    n.roomId,
      senderId:  n.senderId,
      avatar:    n.avatar,
      isRead:    false,
      read:      false,
      timestamp: n.createdAt
    }
  } catch (err) {
    console.error('createNotification error:', err)
    return null
  }
}