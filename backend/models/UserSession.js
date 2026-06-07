const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token:      { type: String, required: true },
  device:     { type: String, default: 'Unknown' },
  ip:         { type: String, default: '' },
  userAgent:  { type: String, default: '' },
  lastActive: { type: Date, default: Date.now },
  createdAt:  { type: Date, default: Date.now },
}, { timestamps: false });

module.exports = mongoose.model('UserSession', userSessionSchema);