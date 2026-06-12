/**
 * expireMessages.js  —  backend/jobs/expireMessages.js
 *
 * Phase 1: Disappearing messages background job.
 *
 * Runs every 60 seconds using setInterval (no extra dependencies).
 * Finds all messages where:
 *   - expiresAt is set (not null) and is <= now
 *   - isDeleted is not already true
 * Soft-deletes them (isDeleted = true, content = '') and emits
 * 'message:expired' to the message's roomId Socket.IO room so every
 * connected client removes the bubble in real time.
 *
 * Usage: call startExpireMessagesJob(io) after connectDB() resolves.
 * Returns the interval ID so callers can clearInterval() if needed.
 */

const Message = require('../models/Message')

const INTERVAL_MS = 60 * 1000 // 60 seconds

/**
 * @param {import('socket.io').Server} io
 * @returns {NodeJS.Timeout}
 */
function startExpireMessagesJob(io) {
  console.log('[expireMessages] Background job started — interval: 60s')

  const intervalId = setInterval(async () => {
    try {
      const now = new Date()

      // Find messages that have passed their expiry time and are not yet deleted
      const expiredMessages = await Message.find({
        expiresAt:  { $lte: now, $ne: null },
        isDeleted:  { $ne: true },
      }).select('_id roomId')

      if (!expiredMessages.length) return

      // Collect IDs for bulk update
      const ids = expiredMessages.map(m => m._id)

      // Soft-delete: clear content so no data lingers in DB
      await Message.updateMany(
        { _id: { $in: ids } },
        { $set: { isDeleted: true, content: '' } }
      )

      console.log(`[expireMessages] Expired ${ids.length} message(s)`)

      // Notify each affected room so connected clients remove the bubble
      for (const msg of expiredMessages) {
        if (!msg.roomId) continue
        io.to(msg.roomId.toString()).emit('message:expired', {
          messageId: msg._id.toString(),
          roomId:    msg.roomId.toString(),
        })
      }
    } catch (err) {
      console.error('[expireMessages] Error during expiry sweep:', err)
    }
  }, INTERVAL_MS)

  return intervalId
}

module.exports = { startExpireMessagesJob }