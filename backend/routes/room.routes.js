const router      = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const {
  getRooms,
  getRequests,
  createRoom,
  acceptRequest,
  rejectRequest,
  getRoomById,
  getRoomMedia,
  clearChat,
  leaveRoom,
  muteRoom,
  reportRoom,
} = require('../controllers/room.controller');
const RoomKey = require('../models/RoomKey');

// ── Existing routes ───────────────────────────────────────────────────────────
router.get('/',                    protect, getRooms);
router.get('/requests',            protect, getRequests);
router.post('/',                   protect, createRoom);
router.get('/:roomId',             protect, getRoomById);
router.patch('/:roomId/accept',    protect, acceptRequest);
router.patch('/:roomId/reject',    protect, rejectRequest);
router.get('/:roomId/media',       protect, getRoomMedia);
router.delete('/:roomId/messages', protect, clearChat);
router.post('/:roomId/leave',      protect, leaveRoom);
router.post('/:roomId/mute',       protect, muteRoom);
router.post('/:roomId/report',     protect, reportRoom);

// ── E2E encryption key routes ─────────────────────────────────────────────────

/**
 * GET /api/rooms/:id/key
 * Returns the encrypted AES key blob for the requesting user in this room.
 */
router.get('/:id/key', protect, async (req, res, next) => {
  try {
    const roomKey = await RoomKey.findOne({ roomId: req.params.id, userId: req.user._id });
    if (!roomKey) return res.status(404).json({ message: 'No key found for this room' });
    res.json(roomKey);
  } catch (err) { next(err); }
});

/**
 * POST /api/rooms/:id/keys
 * Upsert encrypted key blobs for one or more participants.
 * Body: { keys: [{ userId, encryptedKey, publicKey }] }
 * Used when creating a room or adding new participants.
 */
router.post('/:id/keys', protect, async (req, res, next) => {
  try {
    const { keys } = req.body;
    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ message: 'keys array is required' });
    }

    const ops = keys.map(({ userId, encryptedKey, publicKey }) => ({
      updateOne: {
        filter: { roomId: req.params.id, userId },
        update: { $set: { encryptedKey, publicKey, createdAt: new Date() } },
        upsert: true,
      },
    }));

    await RoomKey.bulkWrite(ops);
    res.json({ message: 'Keys stored successfully' });
  } catch (err) { next(err); }
});

module.exports = router;