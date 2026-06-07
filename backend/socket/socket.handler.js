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

// ── Helper: compute aggregate status for a message ───────────────────────────
// Returns: 'sent' | 'delivered' | 'read'
function computeStatus(msg, room, senderId) {
  if (!room) return 'sent'

  if (room.isGroup) {
    const others = (room.participantIds || []).filter(
      p => p.toString() !== senderId.toString()
    )
    if (!others.length) return 'sent'

    const readBySet      = new Set((msg.readBy      || []).map(id => id.toString()))
    const deliveredToSet = new Set((msg.deliveredTo || []).map(id => id.toString()))

    const allRead      = others.every(id => readBySet.has(id.toString()))
    const allDelivered = others.every(id => deliveredToSet.has(id.toString()))

    if (allRead)      return 'read'
    if (allDelivered) return 'delivered'
    return 'sent'
  }

  // Individual chat
  if (msg.readAt)      return 'read'
  if (msg.deliveredAt) return 'delivered'
  return 'sent'
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

    // ── Auto-join ALL rooms the user belongs to ─────────────────────────────
    try {
      const userRooms = await Room.find({
        participantIds: socket.user._id,
        status: { $ne: 'rejected' }
      }).select('_id isGroup participantIds')

      const roomIds = userRooms.map(r => r._id.toString())
      if (roomIds.length) {
        socket.join(roomIds)
        console.log(`${socket.user.name} auto-joined ${roomIds.length} rooms`)
      }

      // ── On connect: deliver all undelivered messages to this user ──────────
      // Find all messages sent by others that haven't been delivered to this user yet
      const undeliveredMessages = await Message.find({
        roomId:      { $in: userRooms.map(r => r._id) },
        senderId:    { $ne: socket.user._id },
        isDeleted:   { $ne: true },
        // Individual: deliveredAt not set
        // Group: user not in deliveredTo
        $or: [
          { deliveredAt: null,                         },
          { deliveredTo: { $ne: socket.user._id } }
        ]
      }).populate('roomId', 'isGroup participantIds')

      const now = new Date()
      for (const msg of undeliveredMessages) {
        const room = msg.roomId // populated
        if (!room) continue

        const senderIdStr = msg.senderId.toString()

        if (room.isGroup) {
          // Mark this user as delivered in the group
          await Message.findByIdAndUpdate(msg._id, {
            $addToSet: { deliveredTo: socket.user._id },
          })

          // Safely upsert memberStatuses entry — avoids BadValue on old docs missing the field
          const msgDoc = await Message.findById(msg._id)
          if (!msgDoc) continue
          // Ensure memberStatuses array exists on the document
          if (!Array.isArray(msgDoc.memberStatuses)) {
            msgDoc.memberStatuses = []
          }
          const existing = msgDoc.memberStatuses.find(
            ms => ms.userId && ms.userId.toString() === socket.user._id.toString()
          )
          if (existing) {
            if (!existing.deliveredAt) existing.deliveredAt = now
          } else {
            msgDoc.memberStatuses.push({ userId: socket.user._id, deliveredAt: now })
          }
          await msgDoc.save()

          // Re-fetch to compute new aggregate status
          const updated = await Message.findById(msg._id).populate('roomId', 'isGroup participantIds')
          const newStatus = computeStatus(updated, room, senderIdStr)

          // Notify sender of delivery
          const senderSockets = (await io.fetchSockets()).filter(
            s => s.user?._id?.toString() === senderIdStr
          )
          senderSockets.forEach(s => s.emit('group-message-delivered', {
            messageId:  msg._id.toString(),
            roomId:     room._id.toString(),
            userId:     socket.user._id.toString(),
            deliveredAt: now,
            status:     newStatus
          }))

        } else {
          // Individual: set deliveredAt once
          if (!msg.deliveredAt) {
            await Message.findByIdAndUpdate(msg._id, { deliveredAt: now })

            // Notify sender
            const senderSockets = (await io.fetchSockets()).filter(
              s => s.user?._id?.toString() === senderIdStr
            )
            senderSockets.forEach(s => s.emit('message-delivered', {
              messageId:   msg._id.toString(),
              roomId:      room._id.toString(),
              deliveredAt: now,
              status:      'delivered'
            }))
          }
        }
      }
    } catch (err) {
      console.error('Auto-join / deliver error:', err)
    }

    await User.findByIdAndUpdate(socket.user?._id, { isOnline: true })

    // Broadcast this user's online status to everyone
    io.emit('user_online', { userId: socket.user?._id.toString(), isOnline: true })

    // Send currently-online users list to the newly connected socket
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

    // ── Send Message ─────────────────────────────────────────────────────────
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

        const validTypes = ['text', 'image', 'video', 'file', 'document', 'audio', 'gif']
        const msgType = validTypes.includes(type) ? type : 'text'
        const now = new Date()

        // ── Pre-seed memberStatuses for group messages ──
        let initialMemberStatuses = []
        let initialDeliveredTo    = []
        let initialReadBy         = [socket.user._id]

        if (room.isGroup) {
          // Check which members are online right now — they get instant delivery
          const allSockets = await io.fetchSockets()
          const onlineUserIds = new Set(allSockets.map(s => s.user?._id?.toString()).filter(Boolean))

          for (const participant of room.participantIds) {
            if (participant._id.toString() === socket.user._id.toString()) continue
            const isOnline = onlineUserIds.has(participant._id.toString())
            initialMemberStatuses.push({
              userId:      participant._id,
              deliveredAt: isOnline ? now : null,
              readAt:      null
            })
            if (isOnline) {
              initialDeliveredTo.push(participant._id)
            }
          }
        }

        const message = await Message.create({
          content,
          senderId:       socket.user._id,
          roomId,
          type:           msgType,
          fileUrl:        fileUrl      || null,
          fileName:       fileName     || null,
          mimeType:       mimeType     || null,
          fileDuration:   fileDuration || null,
          sentAt:         now,
          readBy:         initialReadBy,
          deliveredTo:    initialDeliveredTo,
          memberStatuses: initialMemberStatuses,
        })

        await Room.findByIdAndUpdate(roomId, {
          lastMessage: message._id,
          updatedAt: new Date()
        })

        await message.populate('senderId', 'name avatar')

        // ── Compute initial status ──
        const status = computeStatus(message, room, socket.user._id)

        const formatted = {
          id:             message._id.toString(),
          content:        message.content,
          senderId:       message.senderId._id.toString(),
          senderName:     message.senderId.name,
          senderAvatar:   message.senderId.avatar,
          roomId:         message.roomId.toString(),
          timestamp:      message.createdAt,
          sentAt:         message.sentAt,
          deliveredAt:    message.deliveredAt,
          readAt:         message.readAt,
          deliveredTo:    message.deliveredTo,
          readBy:         message.readBy,
          memberStatuses: message.memberStatuses,
          type:           message.type,
          fileUrl:        message.fileUrl,
          fileName:       message.fileName,
          mimeType:       message.mimeType,
          fileDuration:   message.fileDuration,
          status,
        }

        // Send to all OTHER sockets in the room
        socket.to(roomId).emit('receive_message', { message: formatted })
        // Confirm to the sender (with status ticks)
        socket.emit('message_sent', { message: formatted, tempId })

        // ── Individual chat: emit delivered immediately if receiver is online ──
        if (!room.isGroup) {
          const otherParticipants = room.participantIds.filter(
            p => p._id.toString() !== socket.user._id.toString()
          )

          for (const participant of otherParticipants) {
            if (!room.isGroup) {
              const blocked = await isBlockedBetween(socket.user._id, participant._id)
              if (blocked) continue
            }

            const recipientSockets = (await io.fetchSockets()).filter(
              s => s.user?._id?.toString() === participant._id.toString()
            )

            if (recipientSockets.length) {
              // Receiver is online → mark delivered immediately
              const deliveredAt = new Date()
              await Message.findByIdAndUpdate(message._id, { deliveredAt })
              socket.emit('message-delivered', {
                messageId:   message._id.toString(),
                roomId:      roomId.toString(),
                deliveredAt,
                status:      'delivered'
              })
            }

            recipientSockets.forEach(s =>
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
              recipientSockets.forEach(s => s.emit('notification:new', {
                notification: notif,
                receiverId: participant._id.toString()
              }))
            }
          }
        } else {
          // Group: notify all online members + send unread increments
          const otherParticipants = room.participantIds.filter(
            p => p._id.toString() !== socket.user._id.toString()
          )
          for (const participant of otherParticipants) {
            const recipientSockets = (await io.fetchSockets()).filter(
              s => s.user?._id?.toString() === participant._id.toString()
            )

            recipientSockets.forEach(s =>
              s.emit('unread_increment', { roomId: roomId.toString() })
            )

            const notif = await createNotification({
              userId:   participant._id,
              type:     'group',
              title:    room.groupName,
              body:     type === 'text' ? content : `Sent a ${type}`,
              roomId:   roomId,
              senderId: socket.user._id,
              avatar:   socket.user.avatar
            })

            if (notif) {
              recipientSockets.forEach(s => s.emit('notification:new', {
                notification: notif,
                receiverId: participant._id.toString()
              }))
            }
          }

          // Inform sender of delivery to online members
          if (initialDeliveredTo.length) {
            const updatedStatus = computeStatus(message, room, socket.user._id)
            socket.emit('group-message-delivered', {
              messageId:   message._id.toString(),
              roomId:      roomId.toString(),
              deliveredAt: now,
              status:      updatedStatus
            })
          }
        }

      } catch (err) {
        console.error('send_message error:', err)
      }
    })

    // ── Individual: client explicitly marks delivered ────────────────────────
    socket.on('message-delivered', async ({ messageId, roomId }) => {
      try {
        const msg = await Message.findById(messageId).populate('roomId', 'isGroup participantIds')
        if (!msg || msg.deliveredAt) return

        const now = new Date()
        await Message.findByIdAndUpdate(messageId, { deliveredAt: now })

        // Notify sender
        const senderSockets = (await io.fetchSockets()).filter(
          s => s.user?._id?.toString() === msg.senderId.toString()
        )
        senderSockets.forEach(s => s.emit('message-delivered', {
          messageId,
          roomId,
          deliveredAt: now,
          status:      'delivered'
        }))
      } catch (err) {
        console.error('message-delivered error:', err)
      }
    })

    // ── Individual: mark read ────────────────────────────────────────────────
    socket.on('message_read', async ({ roomId } = {}) => {
      if (!roomId) return
      try {
        const now  = new Date()
        const room = await Room.findById(roomId).select('isGroup participantIds')
        if (!room || room.isGroup) return

        // Update all unread messages in this room sent to the current user
        const updated = await Message.updateMany(
          {
            roomId,
            senderId:  { $ne: socket.user._id },
            readAt:    null,
            isDeleted: { $ne: true }
          },
          { $set: { readAt: now, deliveredAt: now }, $addToSet: { readBy: socket.user._id } }
        )

        if (updated.modifiedCount > 0) {
          // Get last updated message for event payload
          const lastMsg = await Message.findOne({
            roomId,
            senderId: { $ne: socket.user._id },
            readAt:   now
          }).sort({ createdAt: -1 })

          // Notify sender(s) in the room
          socket.to(roomId).emit('message-read', {
            roomId,
            userId:  socket.user._id.toString(),
            readAt:  now,
            messageId: lastMsg?._id?.toString(),
            status:  'read'
          })
        }
      } catch (err) {
        // Fallback: still broadcast legacy event
        socket.to(roomId).emit('message_read', { roomId, userId: socket.user._id.toString() })
      }
    })

    // ── Group: member marks delivered ────────────────────────────────────────
    socket.on('group-message-delivered', async ({ messageId, roomId }) => {
      try {
        const msg = await Message.findById(messageId).populate('roomId', 'isGroup participantIds')
        if (!msg) return

        const userId = socket.user._id
        const now    = new Date()

        // Add to deliveredTo if not already there
        if (!msg.deliveredTo.map(id => id.toString()).includes(userId.toString())) {
          await Message.findByIdAndUpdate(messageId, {
            $addToSet: { deliveredTo: userId }
          })

          // Update or create memberStatuses entry
          const msIdx = msg.memberStatuses.findIndex(ms => ms.userId.toString() === userId.toString())
          if (msIdx >= 0) {
            await Message.findByIdAndUpdate(messageId, {
              $set: { [`memberStatuses.${msIdx}.deliveredAt`]: now }
            })
          } else {
            await Message.findByIdAndUpdate(messageId, {
              $push: { memberStatuses: { userId, deliveredAt: now } }
            })
          }
        }

        const updatedMsg = await Message.findById(messageId).populate('roomId', 'isGroup participantIds')
        const newStatus  = computeStatus(updatedMsg, updatedMsg.roomId, updatedMsg.senderId)

        const senderSockets = (await io.fetchSockets()).filter(
          s => s.user?._id?.toString() === updatedMsg.senderId.toString()
        )
        senderSockets.forEach(s => s.emit('group-message-delivered', {
          messageId,
          roomId,
          userId:      userId.toString(),
          deliveredAt: now,
          status:      newStatus
        }))
      } catch (err) {
        console.error('group-message-delivered error:', err)
      }
    })

    // ── Group: member marks read ─────────────────────────────────────────────
    socket.on('group-message-read', async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId).select('isGroup participantIds')
        if (!room || !room.isGroup) return

        const userId = socket.user._id
        const now    = new Date()

        // Find all unread messages in this room for current user
        const msgs = await Message.find({
          roomId,
          senderId:  { $ne: userId },
          isDeleted: { $ne: true },
          readBy:    { $ne: userId }
        })

        for (const msg of msgs) {
          await Message.findByIdAndUpdate(msg._id, {
            $addToSet: { readBy:      userId,
                         deliveredTo: userId }
          })

          const msIdx = msg.memberStatuses.findIndex(ms => ms.userId.toString() === userId.toString())
          if (msIdx >= 0) {
            await Message.findByIdAndUpdate(msg._id, {
              $set: {
                [`memberStatuses.${msIdx}.readAt`]:      now,
                [`memberStatuses.${msIdx}.deliveredAt`]: now,
              }
            })
          } else {
            await Message.findByIdAndUpdate(msg._id, {
              $push: { memberStatuses: { userId, deliveredAt: now, readAt: now } }
            })
          }

          const updatedMsg = await Message.findById(msg._id).populate('roomId', 'isGroup participantIds')
          const newStatus  = computeStatus(updatedMsg, room, updatedMsg.senderId)

          const senderSockets = (await io.fetchSockets()).filter(
            s => s.user?._id?.toString() === updatedMsg.senderId.toString()
          )
          senderSockets.forEach(s => s.emit('group-message-read', {
            messageId:  msg._id.toString(),
            roomId,
            userId:     userId.toString(),
            readAt:     now,
            status:     newStatus
          }))
        }
      } catch (err) {
        console.error('group-message-read error:', err)
      }
    })

    // ── Phase 12.1 Typing — Individual Chat ──────────────────────────────────
    socket.on('typing-start', async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId).select('participantIds isGroup')
        if (!room || room.isGroup) return
        const otherId = room.participantIds.find(p => p.toString() !== socket.user._id.toString())
        if (otherId) {
          const blocked = await isBlockedBetween(socket.user._id, otherId)
          if (blocked) return
        }
        socket.to(roomId).emit('typing-start', { userId: socket.user._id.toString(), userName: socket.user.name, roomId })
      } catch (err) {
        socket.to(roomId).emit('typing-start', { userId: socket.user._id.toString(), roomId })
      }
    })

    socket.on('typing-stop', async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId).select('participantIds isGroup')
        if (!room || room.isGroup) return
        const otherId = room.participantIds.find(p => p.toString() !== socket.user._id.toString())
        if (otherId) {
          const blocked = await isBlockedBetween(socket.user._id, otherId)
          if (blocked) return
        }
        socket.to(roomId).emit('typing-stop', { userId: socket.user._id.toString(), roomId })
      } catch (err) {
        socket.to(roomId).emit('typing-stop', { userId: socket.user._id.toString(), roomId })
      }
    })

    // ── Phase 12.1 Typing — Group Chat ───────────────────────────────────────
    socket.on('group-typing-start', async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId).select('participantIds isGroup')
        if (!room || !room.isGroup) return
        socket.to(roomId).emit('group-typing-start', { userId: socket.user._id.toString(), userName: socket.user.name, roomId })
      } catch (err) {
        socket.to(roomId).emit('group-typing-start', { userId: socket.user._id.toString(), userName: socket.user.name, roomId })
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

    // ── Legacy typing (backwards compat) ─────────────────────────────────────
    socket.on('user_typing', async ({ roomId, isTyping }) => {
      try {
        const room = await Room.findById(roomId).select('participantIds isGroup')
        if (!room || room.isGroup) {
          socket.to(roomId).emit('user_typing', { userId: socket.user._id.toString(), roomId, isTyping })
          return
        }
        const otherId = room.participantIds.find(p => p.toString() !== socket.user._id.toString())
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
        const otherId = room.participantIds.find(p => p.toString() !== socket.user._id.toString())
        if (otherId) {
          const blocked = await isBlockedBetween(socket.user._id, otherId)
          if (blocked) return
        }
        socket.to(roomId).emit('user_stop_typing', { userId: socket.user._id.toString(), roomId })
      } catch (err) {
        socket.to(roomId).emit('user_stop_typing', { userId: socket.user._id.toString(), roomId })
      }
    })

    // ── Edit Message ──────────────────────────────────────────────────────────
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

    // ── Delete Message ────────────────────────────────────────────────────────
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

    // ── Message Info: get detailed status ─────────────────────────────────────
    socket.on('message:info', async ({ messageId }) => {
      try {
        const msg = await Message.findById(messageId)
          .populate('senderId', 'name avatar')
          .populate('readBy',      'name avatar')
          .populate('deliveredTo', 'name avatar')
          .populate('memberStatuses.userId', 'name avatar')

        if (!msg) return

        const room = await Room.findById(msg.roomId).populate('participantIds', 'name avatar')
        if (!room) return

        // Build rich info payload
        const info = {
          messageId:  msg._id.toString(),
          roomId:     msg.roomId.toString(),
          isGroup:    room.isGroup,
          type:       msg.type,
          sentAt:     msg.sentAt || msg.createdAt,
          deliveredAt: msg.deliveredAt || null,
          readAt:      msg.readAt      || null,
          sender: {
            id:     msg.senderId._id.toString(),
            name:   msg.senderId.name,
            avatar: msg.senderId.avatar
          },
          status: computeStatus(msg, room, msg.senderId._id),
        }

        if (room.isGroup) {
          // Build per-member statuses
          const members = room.participantIds.filter(
            p => p._id.toString() !== msg.senderId._id.toString()
          )

          info.memberDetails = members.map(member => {
            const ms = msg.memberStatuses.find(
              s => s.userId?._id?.toString() === member._id.toString()
                || s.userId?.toString()    === member._id.toString()
            )
            return {
              userId:      member._id.toString(),
              name:        member.name,
              avatar:      member.avatar,
              deliveredAt: ms?.deliveredAt || null,
              readAt:      ms?.readAt      || null,
              status: ms?.readAt      ? 'read'
                    : ms?.deliveredAt ? 'delivered'
                    :                   'sent'
            }
          })

          // Aggregate group timestamps
          const allDeliveredAts = info.memberDetails.map(m => m.deliveredAt).filter(Boolean)
          const allReadAts      = info.memberDetails.map(m => m.readAt).filter(Boolean)
          info.deliveredAt = allDeliveredAts.length ? new Date(Math.max(...allDeliveredAts.map(d => new Date(d)))) : null
          info.readAt      = allReadAts.length      ? new Date(Math.max(...allReadAts.map(d => new Date(d))))      : null

          // Get receiver info for 1-on-1 compatibility — N/A for group
          info.receiver = null
        } else {
          const receiver = room.participantIds.find(
            p => p._id.toString() !== msg.senderId._id.toString()
          )
          info.receiver = receiver
            ? { id: receiver._id.toString(), name: receiver.name, avatar: receiver.avatar }
            : null
        }

        socket.emit('message:info-response', info)
      } catch (err) {
        console.error('message:info error:', err)
      }
    })

    // ── Message Request ───────────────────────────────────────────────────────
    socket.on('send_request', async ({ receiverId, roomId, senderName }) => {
      try {
        const blocked = await isBlockedBetween(socket.user._id, receiverId)
        if (blocked) return
      } catch (err) { /* fallback: allow */ }

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

    // ── Notifications ─────────────────────────────────────────────────────────
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

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      await User.findByIdAndUpdate(socket.user?._id, {
        isOnline: false, lastSeen: new Date()
      })
      io.emit('user_online', { userId: socket.user?._id.toString(), isOnline: false })
      console.log('Disconnected:', socket.user?.name)
    })
  })
}