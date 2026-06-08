const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const {
  getHistory,
  sendMessage,
  editMessage,
  deleteMessage,
  markRead,
  getUnreadCount,
  getAllUnreadCounts,
  getMessageInfo,
  reportMessage,
} = require('../controllers/message.controller');

router.get('/unread-counts',         protect, getAllUnreadCounts);  // bulk — must come BEFORE /:roomId
router.get('/:roomId',               protect, getHistory);
router.get('/:roomId/unread-count',  protect, getUnreadCount);
router.post('/',                     protect, sendMessage);
router.put('/:messageId',            protect, editMessage);
router.delete('/:messageId',         protect, deleteMessage);
router.post('/:roomId/read',         protect, markRead);
router.get('/info/:messageId',       protect, getMessageInfo);     // Message Info panel
router.post('/:messageId/report',    protect, reportMessage);       // Report a message

module.exports = router;