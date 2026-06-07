const router      = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const {
  getAllUsers,
  searchUsers,
  getUserById,
  updateProfile,
  updatePrivacy,
  getUserStats,
  getBlockedUsers,
  blockUser,
  reportUser,
  muteUser
} = require('../controllers/user.controller');

// IMPORTANT: specific paths MUST come before :userId wildcard
router.get ('/',                  protect, getAllUsers);
router.get ('/search',            protect, searchUsers);
router.get ('/me/stats',          protect, getUserStats);
router.get ('/me/blocked',        protect, getBlockedUsers);
router.put ('/me',                protect, updateProfile);
router.put ('/me/privacy',        protect, updatePrivacy);
router.get ('/:userId',           protect, getUserById);
router.post('/:userId/block',     protect, blockUser);
router.post('/:userId/report',    protect, reportUser);
router.post('/:userId/mute',      protect, muteUser);

module.exports = router;