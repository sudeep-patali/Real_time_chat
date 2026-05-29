const Room = require('../models/Room');

exports.getRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({ participantIds: req.user._id })
      .populate('participantIds', 'name avatar isOnline')
      .populate({ path: 'lastMessage',
                  populate: { path: 'senderId', select: 'name' } })
      .sort({ updatedAt: -1 });
    res.json({ rooms });
  } catch (err) { next(err); }
};

exports.createRoom = async (req, res, next) => {
  try {
    const { participantIds, isGroup, groupName } = req.body;
    const all = [...new Set([...participantIds, req.user._id.toString()])];
    if (!isGroup) {
      const existing = await Room.findOne({
        isGroup: false,
        participantIds: { $all: all, $size: 2 }
      });
      if (existing) return res.json({ room: existing });
    }
    const room = await Room.create({
      participantIds: all, isGroup, groupName,
      createdBy: req.user._id
    });
    await room.populate('participantIds', 'name avatar');
    res.status(201).json({ room });
  } catch (err) { next(err); }
};