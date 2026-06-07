const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['message', 'group', 'system', 'request'],
    default: 'message'
  },
  title:    { type: String, default: '' },
  body:     { type: String, default: '' },
  roomId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isRead:   { type: Boolean, default: false },
  avatar:   { type: String, default: null }
}, { timestamps: true })

notificationSchema.index({ userId: 1, createdAt: -1 })
notificationSchema.index({ userId: 1, isRead: 1 })

module.exports = mongoose.model('Notification', notificationSchema)