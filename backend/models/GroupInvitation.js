const mongoose = require('mongoose')

const groupInvitationSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invitedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled'],
    default: 'pending'
  }
}, { timestamps: true })

// Only one active invite per user per group
groupInvitationSchema.index({ groupId: 1, invitedUser: 1, status: 1 })

module.exports = mongoose.model('GroupInvitation', groupInvitationSchema)