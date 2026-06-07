const User    = require('../models/User')
const Room    = require('../models/Room')
const Message = require('../models/Message')
const path    = require('path')
const { ALLOWED_MIME } = require('../middleware/upload.middleware')

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

// POST /api/media/upload
exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' })

    const { roomId } = req.body
    if (roomId) {
      const room = await Room.findById(roomId).select('participantIds isGroup')
      if (room && !room.isGroup) {
        const otherId = room.participantIds.find(p => p.toString() !== req.user._id.toString())
        if (otherId) {
          const blocked = await isBlockedBetween(req.user._id, otherId)
          if (blocked) return res.status(403).json({ message: 'You cannot share files with this user.' })
        }
      }
    }

    const mediaType = ALLOWED_MIME[req.file.mimetype] || 'document'
    const url       = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
    const fileName  = req.file.originalname
    const fileSize  = req.file.size
    const mimeType  = req.file.mimetype

    res.json({ url, mediaType, fileName, fileSize, mimeType })
  } catch (err) { next(err) }
}

// GET /api/rooms/:roomId/media
exports.getRoomMedia = async (req, res, next) => {
  try {
    const { roomId } = req.params
    const messages = await Message.find({
      roomId,
      type:      { $in: ['image', 'video', 'file', 'document', 'audio'] },
      isDeleted: { $ne: true },
      fileUrl:   { $ne: null }
    })
    .sort({ createdAt: -1 })
    .select('type fileUrl content createdAt senderId fileName mimeType')
    .populate('senderId', 'name')
    .lean()

    const media     = messages.filter(m => m.type === 'image' || m.type === 'video')
    const documents = messages.filter(m => m.type === 'file' || m.type === 'document')

    res.json({ media, documents })
  } catch (err) { next(err) }
}