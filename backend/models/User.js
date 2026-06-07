const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true },
  password:     { type: String, required: true, minlength: 6 },
  avatar:       { type: String, default: null },
  bio:          { type: String, default: '' },
  username:     { type: String, default: '', trim: true },
  role:         { type: String, enum: ['admin','member'], default: 'member' },
  isOnline:     { type: Boolean, default: false },
  lastSeen:     { type: Date, default: Date.now },

  // Status
  statusValue:  { type: String, default: 'available' },
  customStatus: { type: String, default: '' },

  // Privacy settings
  privacy: {
    profilePhoto:  { type: String, enum: ['everyone','accepted','nobody'], default: 'everyone' },
    lastSeen:      { type: String, enum: ['everyone','accepted','nobody'], default: 'everyone' },
    onlineStatus:  { type: String, enum: ['everyone','accepted','nobody'], default: 'everyone' },
    addToGroups:   { type: String, enum: ['everyone','accepted','nobody'], default: 'everyone' },
    messages:      { type: String, enum: ['everyone','accepted','nobody'], default: 'everyone' },
  },

  // Statistics counters
  stats: {
    messagesSent: { type: Number, default: 0 },
    filesShared:  { type: Number, default: 0 },
    mediaShared:  { type: Number, default: 0 },
  },

  // Phase 8.3 — User Actions
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  mutedUsers:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  mutedRooms:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Room'  }]

}, { timestamps: true });

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.matchPassword = async function(entered) {
  return await bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);