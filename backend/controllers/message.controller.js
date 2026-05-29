const Message = require('../models/Message');
const Room    = require('../models/Room');

exports.getHistory = async (req, res, next) => {
  try {
    const { cursor, limit = 30 } = req.query;
    const query = { roomId: req.params.roomId };
    if (cursor) query._id = { $lt: cursor };
    const messages = await Message.find(query)
      .populate('senderId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(Number(limit));
    const hasMore = messages.length === Number(limit);
    res.json({
      messages: messages.reverse(),
      hasMore,
      nextCursor: hasMore ? messages[0]._id : null
    });
  } catch (err) { next(err); }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const { content, roomId, type = 'text', fileUrl } = req.body;
    const message = await Message.create({
      content, roomId, type, fileUrl,
      senderId: req.user._id
    });
    await Room.findByIdAndUpdate(roomId, { lastMessage: message._id });
    await message.populate('senderId', 'name avatar');
    res.status(201).json({ message });
  } catch (err) { next(err); }
};

exports.deleteMessage = async (req, res, next) => {
  try {
    const msg = await Message.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ message: 'Not found' });
    if (msg.senderId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });
    await msg.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

exports.markRead = async (req, res, next) => {
  try {
    await Message.updateMany(
      { roomId: req.params.roomId, readBy: { $ne: req.user._id } },
      { $push: { readBy: req.user._id } }
    );
    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
};