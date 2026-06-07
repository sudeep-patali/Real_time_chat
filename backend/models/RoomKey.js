const mongoose = require('mongoose');

const roomKeySchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Base64: the room AES-256 key encrypted with this user's RSA public key.
  // The server never sees the plaintext key.
  encryptedKey: { type: String, required: true },
  // The user's RSA public key (PEM) at the time this key blob was created.
  publicKey: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Each user can only have one key record per room.
roomKeySchema.index({ roomId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('RoomKey', roomKeySchema);