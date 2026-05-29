const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const {
  getHistory, sendMessage, deleteMessage, markRead
} = require('../controllers/message.controller');

router.get('/:roomId',       protect, getHistory);
router.post('/',             protect, sendMessage);
router.delete('/:messageId', protect, deleteMessage);
router.post('/:roomId/read', protect, markRead);

module.exports = router;