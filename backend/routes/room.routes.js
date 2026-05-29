const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { getRooms, createRoom } = require('../controllers/room.controller');

router.get('/',  protect, getRooms);
router.post('/', protect, createRoom);

module.exports = router;