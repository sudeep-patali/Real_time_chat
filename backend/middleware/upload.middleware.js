const multer = require('multer')
const path   = require('path')
const fs     = require('fs')

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase()
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40)
    cb(null, `${Date.now()}_${base}${ext}`)
  }
})

const ALLOWED_MIME = {
  // Images
  'image/jpeg':    'image',
  'image/jpg':     'image',
  'image/png':     'image',
  'image/gif':     'gif',
  'image/webp':    'image',
  // Video
  'video/mp4':     'video',
  'video/webm':    'video',
  'video/quicktime': 'video',
  // Audio (voice messages)
  'audio/webm':          'audio',
  'audio/webm;codecs=opus': 'audio',
  'audio/ogg':           'audio',
  'audio/ogg;codecs=opus': 'audio',
  'audio/mp4':           'audio',
  'audio/mpeg':          'audio',
  'audio/wav':           'audio',
  // Documents
  'application/pdf':                                                     'document',
  'application/msword':                                                  'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-excel':                                            'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':  'document',
  'text/plain':    'document',
}

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME[file.mimetype]) {
    cb(null, true)
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }   // 50 MB
})

module.exports = upload
module.exports.ALLOWED_MIME = ALLOWED_MIME