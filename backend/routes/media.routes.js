const router = require('express').Router()
const { protect } = require('../middleware/auth.middleware')
const upload = require('../middleware/upload.middleware')
const { uploadFile, getRoomMedia } = require('../controllers/media.controller')

router.post('/upload',            protect, upload.single('file'), uploadFile)
router.get('/rooms/:roomId/media', protect, getRoomMedia)

module.exports = router