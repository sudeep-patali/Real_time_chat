const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { uploadFile } = require('../controllers/media.controller');

router.post('/upload', protect, upload.single('file'), uploadFile);

module.exports = router;