const router = require('express').Router()
const { protect } = require('../middleware/auth.middleware')
const {
  getNotifications,
  markAllRead,
  markOneRead,
  clearAll
} = require('../controllers/notification.controller')

router.get('/',              protect, getNotifications)
router.patch('/read-all',    protect, markAllRead)
router.patch('/:id/read',    protect, markOneRead)
router.delete('/',           protect, clearAll)

module.exports = router