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
  reportRoom
} = require('../controllers/room.controller');

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

module.exports = router;