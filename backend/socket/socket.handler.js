const jwt                    = require('jsonwebtoken')
const User                   = require('../models/User')
const Message                = require('../models/Message')
const Room                   = require('../models/Room')
const { createNotification } = require('../controllers/notification.controller')

// Helper: returns true if userA has blocked userB OR userB has blocked userA
async function isBlockedBetween(userAId, userBId) {
  const [a, b] = await Promise.all([
    User.findById(userAId).select('blockedUsers'),
    User.findById(userBId).select('blockedUsers')
  ])
  if (!a || !b) return false
  const aBlocked = a.blockedUsers.map(id => id.toString())
  const bBlocked = b.blockedUsers.map(id => id.toString())
  return aBlocked.includes(userBId.toString()) || bBlocked.includes(userAId.toString())
}

module.exports = (io) => {

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) return next(new Error('Auth error'))
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      socket.user = await User.findById(decoded.id).select('-password')
      if (!socket.user) return next(new Error('User not found'))
      next()
    } catch (err) {
      next(new Error('Token invalid'))
    }
  })

  io.on('connection', async (socket) => {
    console.log('Connected:', socket.user?.name)

    // ── Auto-join ALL rooms the user belongs to ──────────────────────────
    try {
      const userRooms = await Room.find({
        participantIds: socket.user._id,
        status: { $ne: 'rejected' }
      }).select('_id')

      const roomIds = userRooms.map(r => r._id.toString())
      if (roomIds.length) {
        socket.join(roomIds)
        console.log(`${socket.user.name} auto-joined ${roomIds.length} rooms`)
      }
    } catch (err) {
      console.error('Auto-join rooms error:', err)
    }

    await User.findByIdAndUpdate(socket.user?._id, { isOnline: true })

    // FIX Issue 4: Broadcast this user's online status to everyone
    io.emit('user_online', { userId: socket.user?._id.toString(), isOnline: true })

    // FIX Issue 4: Send the currently-online users list to the newly connected socket
    // so their client can immediately mark others as online without waiting for events.
    try {
      const onlineUsers = await User.find({ isOnline: true, _id: { $ne: socket.user._id } }).select('_id')
      onlineUsers.forEach(u => {
        socket.emit('user_online', { userId: u._id.toString(), isOnline: true })
      })
    } catch (err) {
      console.error('Bootstrap online users error:', err)
    }

    socket.on('join_room', ({ roomId }) => socket.join(roomId))
    socket.on('leave_room', () => {
      // Don't actually leave — messages delivered even when chat is closed.
    })

    // ── Send Message ──
    socket.on('send_message', async ({ content, roomId, type = 'text', fileUrl, fileName, mimeType, fileDuration, tempId }) => {
      try {
        const room = await Room.findById(roomId).populate('participantIds', 'name avatar')
        if (!room) return

        // Block check — only for 1-on-1 DMs
        if (!room.isGroup) {
          const otherParticipant = room.participantIds.find(
            p => p._id.toString() !== socket.user._id.toString()
          )
          if (otherParticipant) {
            const blocked = await isBlockedBetween(socket.user._id, otherParticipant._id)
            if (blocked) {
              socket.emit('message_blocked', { tempId, reason: 'blocked' })
              return
            }
          }
        }

        // Validate type — include gif
        const validTypes = ['text', 'image', 'video', 'file', 'document', 'audio', 'gif']
        const msgType = validTypes.includes(type) ? type : 'text'

        const message = await Message.create({
          content,
          senderId: socket.user._id,
          roomId,
          type: msgType,
          fileUrl:      fileUrl      || null,
          fileName:     fileName     || null,
          mimeType:     mimeType     || null,
          fileDuration: fileDuration || null,
          readBy: [socket.user._id]   // sender has already "read" their own message
        })

        await Room.findByIdAndUpdate(roomId, {
          lastMessage: message._id,
          updatedAt: new Date()
        })

        await message.populate('senderId', 'name avatar')

        const formatted = {
          id:           message._id.toString(),
          content:      message.content,
          // FIX Issue 2: always send senderId as a plain string
          senderId:     message.senderId._id.toString(),
          senderName:   message.senderId.name,
          senderAvatar: message.senderId.avatar,
          roomId:       message.roomId.toString(),
          timestamp:    message.createdAt,
          type:         message.type,
          fileUrl:      message.fileUrl,
          fileName:     message.fileName,
          mimeType:     message.mimeType,
          fileDuration: message.fileDuration,
          readBy:       message.readBy
        }

        // Send to all OTHER sockets in the room (not the sender)
        socket.to(roomId).emit('receive_message', { message: formatted })
        // Confirm to the sender
        socket.emit('message_sent', { message: formatted, tempId })

        // ── Emit unread_increment ONLY to offline/other-tab users ──────────
        const otherParticipants = room.participantIds.filter(
          p => p._id.toString() !== socket.user._id.toString()
        )

        for (const participant of otherParticipants) {
          if (!room.isGroup) {
            const blocked = await isBlockedBetween(socket.user._id, participant._id)
            if (blocked) continue
          }

          const recipientSockets = await io.fetchSockets()
          const recipientTargets = recipientSockets.filter(
            s => s.user?._id?.toString() === participant._id.toString()
          )

          recipientTargets.forEach(s =>
            s.emit('unread_increment', { roomId: roomId.toString() })
          )

          const notif = await createNotification({
            userId:   participant._id,
            type:     room.isGroup ? 'group' : 'message',
            title:    room.isGroup ? room.groupName : socket.user.name,
            body:     type === 'text' ? content : `Sent a ${type}`,
            roomId:   roomId,
            senderId: socket.user._id,
            avatar:   socket.user.avatar
          })

          if (notif) {
            recipientTargets.forEach(s => s.emit('notification:new', {
              notification: notif,
              receiverId: participant._id.toString()
            }))
          }
        }

      } catch (err) {
        console.error('send_message error:', err)
      }
    })

    // ── Phase 12.1 Typing — Individual Chat ──
    socket.on('typing-start', async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId).select('participantIds isGroup')
        if (!room || room.isGroup) return

        const otherId = room.participantIds.find(
          p => p.toString() !== socket.user._id.toString()
        )
        if (otherId) {
          const blocked = await isBlockedBetween(socket.user._id, otherId)
          if (blocked) return
        }
        socket.to(roomId).emit('typing-start', {
          userId:     socket.user._id.toString(),
          userName:   socket.user.name,
          roomId
        })
      } catch (err) {
        socket.to(roomId).emit('typing-start', { userId: socket.user._id.toString(), roomId })
      }
    })

    socket.on('typing-stop', async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId).select('participantIds isGroup')
        if (!room || room.isGroup) return

        const otherId = room.participantIds.find(
          p => p.toString() !== socket.user._id.toString()
        )
        if (otherId) {
          const blocked = await isBlockedBetween(socket.user._id, otherId)
          if (blocked) return
        }
        socket.to(roomId).emit('typing-stop', { userId: socket.user._id.toString(), roomId })
      } catch (err) {
        socket.to(roomId).emit('typing-stop', { userId: socket.user._id.toString(), roomId })
      }
    })

    // ── Phase 12.1 Typing — Group Chat ──
    socket.on('group-typing-start', async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId).select('participantIds isGroup')
        if (!room || !room.isGroup) return

        socket.to(roomId).emit('group-typing-start', {
          userId:   socket.user._id.toString(),
          userName: socket.user.name,
          roomId
        })
      } catch (err) {
        socket.to(roomId).emit('group-typing-start', {
          userId: socket.user._id.toString(),
          userName: socket.user.name,
          roomId
        })
      }
    })

    socket.on('group-typing-stop', async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId).select('participantIds isGroup')
        if (!room || !room.isGroup) return

        socket.to(roomId).emit('group-typing-stop', { userId: socket.user._id.toString(), roomId })
      } catch (err) {
        socket.to(roomId).emit('group-typing-stop', { userId: socket.user._id.toString(), roomId })
      }
    })

    // ── Legacy typing (keep for backwards compat) ──
    socket.on('user_typing', async ({ roomId, isTyping }) => {
      try {
        const room = await Room.findById(roomId).select('participantIds isGroup')
        if (!room || room.isGroup) {
          socket.to(roomId).emit('user_typing', { userId: socket.user._id.toString(), roomId, isTyping })
          return
        }
        const otherId = room.participantIds.find(
          p => p.toString() !== socket.user._id.toString()
        )
        if (otherId) {
          const blocked = await isBlockedBetween(socket.user._id, otherId)
          if (blocked) return
        }
        socket.to(roomId).emit('user_typing', { userId: socket.user._id.toString(), roomId, isTyping })
      } catch (err) {
        socket.to(roomId).emit('user_typing', { userId: socket.user._id.toString(), roomId, isTyping })
      }
    })

    socket.on('user_stop_typing', async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId).select('participantIds isGroup')
        if (!room || room.isGroup) {
          socket.to(roomId).emit('user_stop_typing', { userId: socket.user._id.toString(), roomId })
          return
        }
        const otherId = room.participantIds.find(
          p => p.toString() !== socket.user._id.toString()
        )
        if (otherId) {
          const blocked = await isBlockedBetween(socket.user._id, otherId)
          if (blocked) return
        }
        socket.to(roomId).emit('user_stop_typing', { userId: socket.user._id.toString(), roomId })
      } catch (err) {
        socket.to(roomId).emit('user_stop_typing', { userId: socket.user._id.toString(), roomId })
      }
    })

    // ── Read receipts ──
    socket.on('message_read', ({ roomId } = {}) => {
      if (!roomId) return
      socket.to(roomId).emit('message_read', { roomId, userId: socket.user._id.toString() })
    })

    socket.on('message_delivered', ({ roomId, messageId } = {}) => {
      if (!roomId || !messageId) return
      socket.to(roomId).emit('message_delivered', { roomId, messageId })
    })

    // ── Edit Message ──
    socket.on('message:edit', async ({ messageId, content, roomId }) => {
      try {
        const msg = await Message.findById(messageId)
        if (!msg) return
        if (msg.senderId.toString() !== socket.user._id.toString()) return
        if (msg.type !== 'text' || msg.isDeleted) return

        msg.content  = content.trim()
        msg.isEdited = true
        msg.editedAt = new Date()
        await msg.save()

        io.to(roomId).emit('message:edited', {
          messageId,
          content:  msg.content,
          editedAt: msg.editedAt,
          roomId
        })
      } catch (err) {
        console.error('message:edit error:', err)
      }
    })

    // ── Delete Message ──
    socket.on('message:delete', async ({ messageId, roomId, deleteFor }) => {
      try {
        const msg = await Message.findById(messageId)
        if (!msg) return

        if (deleteFor === 'all') {
          if (msg.senderId.toString() !== socket.user._id.toString()) return
          msg.isDeleted = true
          msg.content   = ''
          await msg.save()
          io.to(roomId).emit('message:deleted', { messageId, deleteFor: 'all', roomId })
        } else {
          if (!msg.deletedFor.map(id => id.toString()).includes(socket.user._id.toString())) {
            msg.deletedFor.push(socket.user._id)
            await msg.save()
          }
          socket.emit('message:deleted', { messageId, deleteFor: 'me', roomId })
        }
      } catch (err) {
        console.error('message:delete error:', err)
      }
    })

    // ── Message Request ──
    // FIX Issue 3: After emitting to the receiver, also make the sender's
    // socket join the room so they receive real-time updates immediately.
    socket.on('send_request', async ({ receiverId, roomId, senderName }) => {
      try {
        const blocked = await isBlockedBetween(socket.user._id, receiverId)
        if (blocked) return
      } catch (err) { /* fallback: allow */ }

      // FIX Issue 3: Ensure sender's socket is joined to the room
      socket.join(roomId)

      const receiverSockets = await io.fetchSockets()
      const targets = receiverSockets.filter(
        s => s.user?._id?.toString() === receiverId?.toString()
      )
      const payload = {
        roomId,
        senderId:   socket.user._id.toString(),
        senderName: senderName || socket.user.name,
        receiverId: receiverId?.toString()
      }
      if (targets.length) {
        targets.forEach(s => s.emit('receive_request', payload))
      }
    })

    socket.on('request_accepted', ({ roomId }) => {
      io.to(roomId).emit('request_accepted', { roomId, acceptedBy: socket.user._id.toString() })
    })

    socket.on('request_rejected', ({ roomId }) => {
      io.to(roomId).emit('request_rejected', { roomId, rejectedBy: socket.user._id.toString() })
    })

    // ── Notifications ──
    socket.on('notification:read', async ({ notificationId }) => {
      try {
        const Notification = require('../models/Notification')
        await Notification.findByIdAndUpdate(notificationId, { isRead: true })
      } catch (err) {
        console.error('notification:read error:', err)
      }
    })

    socket.on('notification:read-all', async () => {
      try {
        const Notification = require('../models/Notification')
        await Notification.updateMany(
          { userId: socket.user._id, isRead: false },
          { isRead: true }
        )
      } catch (err) {
        console.error('notification:read-all error:', err)
      }
    })

    // ── Disconnect ──
    socket.on('disconnect', async () => {
      await User.findByIdAndUpdate(socket.user?._id, {
        isOnline: false, lastSeen: new Date()
      })
      // FIX Issue 4: always send userId as string
      io.emit('user_online', { userId: socket.user?._id.toString(), isOnline: false })
      console.log('Disconnected:', socket.user?.name)
    })
  })
}