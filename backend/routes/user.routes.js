const router      = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const {
  getAllUsers,
  searchUsers,
  getUserById,
  updateProfile,
  blockUser,
  reportUser,
  muteUser
} = require('../controllers/user.controller');

router.get('/',                protect, getAllUsers);
router.get('/search',          protect, searchUsers);
router.get('/:userId',         protect, getUserById);
router.put('/me',              protect, updateProfile);
router.post('/:userId/block',  protect, blockUser);
router.post('/:userId/report', protect, reportUser);
router.post('/:userId/mute',   protect, muteUser);

module.exports = router;