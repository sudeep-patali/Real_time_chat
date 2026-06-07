const mongoose = require('mongoose');

const securityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // 'password_changed','login','logout','new_device','2fa_enabled'
  detail: { type: String, default: '' },
  ip:     { type: String, default: '' },
  device: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('SecurityLog', securityLogSchema);