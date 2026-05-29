const jwt  = require('jsonwebtoken');
const User = require('../models/User');

module.exports = (io) => {

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Auth error'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (err) {
      next(new Error('Token invalid'));
    }
  });

  io.on('connection', (socket) => {
    console.log('Connected:', socket.user?.name);

    User.findByIdAndUpdate(socket.user?._id, { isOnline: true });
    io.emit('user_online', { userId: socket.user?._id, isOnline: true });

    socket.on('join_room', ({ roomId }) => {
      socket.join(roomId);
    });

    socket.on('leave_room', ({ roomId }) => {
      socket.leave(roomId);
    });

    socket.on('send_message', async ({ content, roomId, type }) => {
      io.to(roomId).emit('receive_message', {
        message: { content, roomId, type,
                   senderId: socket.user._id }
      });
    });

    socket.on('user_typing', ({ roomId, isTyping }) => {
      socket.to(roomId).emit('user_typing', {
        userId: socket.user._id, roomId, isTyping
      });
    });

    socket.on('disconnect', async () => {
      await User.findByIdAndUpdate(socket.user?._id, {
        isOnline: false, lastSeen: new Date()
      });
      io.emit('user_online', { userId: socket.user?._id, isOnline: false });
    });
  });
};