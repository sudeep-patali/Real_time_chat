require('dotenv').config()
const express    = require('express')
const http       = require('http')
const { Server } = require('socket.io')
const cors       = require('cors')
const path       = require('path')
const fs         = require('fs')
const connectDB  = require('./config/db')

const authRoutes         = require('./routes/auth.routes')
const messageRoutes      = require('./routes/message.routes')
const roomRoutes         = require('./routes/room.routes')
const mediaRoutes        = require('./routes/media.routes')
const userRoutes         = require('./routes/user.routes')
const notificationRoutes = require('./routes/notification.routes')
const groupRoutes        = require('./routes/group.routes')
const settingsRoutes     = require('./routes/settings.routes')
const socketHandler      = require('./socket/socket.handler')

connectDB()

const app    = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }
})

socketHandler(io)

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ── Inject socket.io into every request so controllers can emit events ────
app.set('io', io)
app.use((req, _res, next) => { req.io = io; next() })

// ── Range-request aware static file handler for /uploads ─────────────────
// This lets browsers stream audio/video properly instead of downloading
// the whole file before playing (fixes slow audio on receiver side).
const uploadsDir = path.join(__dirname, 'uploads')

// Handle CORS preflight for /uploads (needed for cross-origin <audio>/<video>)
app.options('/uploads/:filename', (req, res) => {
  const origin = req.headers.origin || process.env.CLIENT_URL || '*'
  res.set({
    'Access-Control-Allow-Origin':      origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods':     'GET, OPTIONS',
    'Access-Control-Allow-Headers':     'Range, Authorization',
    'Access-Control-Expose-Headers':    'Content-Range, Content-Length, Accept-Ranges',
  }).sendStatus(204)
})

app.get('/uploads/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename)
  if (!fs.existsSync(filePath)) return res.status(404).end()

  const stat  = fs.statSync(filePath)
  const total = stat.size
  const range = req.headers.range

  const ext = path.extname(filePath).toLowerCase()
  const mimeMap = {
    '.webm': 'audio/webm',
    '.ogg':  'audio/ogg',
    '.mp3':  'audio/mpeg',
    '.mp4':  'video/mp4',
    '.wav':  'audio/wav',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
    '.webp': 'image/webp',
    '.pdf':  'application/pdf',
  }
  const contentType = mimeMap[ext] || 'application/octet-stream'

  // CORS headers must be set explicitly — res.writeHead() bypasses global cors() middleware.
  const origin = req.headers.origin || process.env.CLIENT_URL || '*'
  const corsHeaders = {
    'Access-Control-Allow-Origin':      origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers':     'Range, Authorization',
    'Access-Control-Expose-Headers':    'Content-Range, Content-Length, Accept-Ranges',
  }

  if (range) {
    const parts     = range.replace(/bytes=/, '').split('-')
    const start     = parseInt(parts[0], 10)
    const end       = parts[1] ? parseInt(parts[1], 10) : total - 1
    const chunkSize = end - start + 1

    res.writeHead(206, {
      ...corsHeaders,
      'Content-Range':  `bytes ${start}-${end}/${total}`,
      'Accept-Ranges':  'bytes',
      'Content-Length': chunkSize,
      'Content-Type':   contentType,
    })
    fs.createReadStream(filePath, { start, end }).pipe(res)
  } else {
    res.writeHead(200, {
      ...corsHeaders,
      'Accept-Ranges':  'bytes',
      'Content-Length': total,
      'Content-Type':   contentType,
    })
    fs.createReadStream(filePath).pipe(res)
  }
})

app.use('/api/auth',          authRoutes)
app.use('/api/messages',      messageRoutes)
app.use('/api/rooms',         roomRoutes)
app.use('/api/media',         mediaRoutes)
app.use('/api/users',         userRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/groups',        groupRoutes(io))
app.use('/api/users',         settingsRoutes)

app.get('/health', (req, res) => res.json({ status: 'OK' }))
app.use(require('./middleware/error.middleware'))

const PORT = process.env.PORT || 5000
server.listen(PORT, () => console.log('Server running on port', PORT))