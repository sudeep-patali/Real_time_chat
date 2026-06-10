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

    const { roomId, uploadSource } = req.body
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

    // uploadSource ('media' | 'document') determines the logical category, not the file's mime type.
    // If the file was sent via the Documents picker, it is always treated as a document regardless
    // of whether it is an image or video.
    const rawMimeType = ALLOWED_MIME[req.file.mimetype] || 'document'
    let mediaType
    if (uploadSource === 'document') {
      mediaType = 'document'
    } else if (uploadSource === 'media') {
      // Only genuine image/video/gif mimetypes are allowed as media
      mediaType = ['image', 'video', 'gif'].includes(rawMimeType) ? rawMimeType : 'document'
    } else {
      mediaType = rawMimeType
    }

    const url      = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
    const fileName = req.file.originalname
    const fileSize = req.file.size
    const mimeType = req.file.mimetype

    res.json({ url, mediaType, fileName, fileSize, mimeType, uploadSource: uploadSource || null })
  } catch (err) { next(err) }
}

// GET /api/rooms/:roomId/media
exports.getRoomMedia = async (req, res, next) => {
  try {
    const { roomId } = req.params
    const messages = await Message.find({
      roomId,
      type:      { $in: ['image', 'video', 'gif', 'file', 'document', 'audio'] },
      isDeleted: { $ne: true },
      fileUrl:   { $ne: null }
    })
    .sort({ createdAt: -1 })
    .select('type fileUrl content createdAt senderId fileName mimeType fileSize uploadSource')
    .populate('senderId', 'name')
    .lean()

    // WhatsApp-style split: the upload SOURCE determines the bucket, not the file type.
    //   uploadSource === 'document' → always goes to Documents tab
    //   uploadSource === 'media'    → always goes to Media tab
    //   uploadSource === null       → legacy fallback: use type
    const media = messages.filter(m => {
      if (m.uploadSource === 'document') return false
      if (m.uploadSource === 'media')    return true
      // Legacy messages without uploadSource: image/video/gif = media
      return m.type === 'image' || m.type === 'video' || m.type === 'gif'
    })

    const documents = messages.filter(m => {
      if (m.uploadSource === 'document') return true
      if (m.uploadSource === 'media')    return false
      // Legacy messages without uploadSource: file/document = docs
      return m.type === 'file' || m.type === 'document'
    })

    res.json({ media, documents })
  } catch (err) { next(err) }
}