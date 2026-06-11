const Room            = require('../models/Room');
const Message         = require('../models/Message');
const User            = require('../models/User');
const Report          = require('../models/Report');
const applyPrivacyRules = require('../utils/applyPrivacyRules');

/**
 * Applies privacy rules to the participantIds array of a populated room document.
 * Returns a new participants array where each entry is filtered for the viewer.
 */
async function filterRoomParticipants(viewerUserId, participants) {
  return Promise.all(participants.map(async (p) => {
    // p is a populated User doc or plain object
    const pf = await applyPrivacyRules(viewerUserId, p);
    return {
      _id:          p._id || p.id,
      id:           (p._id || p.id)?.toString(),
      name:         p.name,
      username:     p.username    || '',
      email:        p.email       || '',
      bio:          p.bio         || '',
      avatar:       pf.profileImage,
      isOnline:     pf.onlineStatus,
      lastSeen:     pf.lastSeen,
      canMessage:   pf.canMessage,
      canAddToGroup: pf.canAddToGroup,
    };
  }));
}

exports.getRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({
      participantIds: req.user._id,
      status: 'accepted'
    })
    .populate('participantIds', 'name avatar isOnline lastSeen bio username email privacy')
    .populate({
      path: 'lastMessage',
      populate: { path: 'senderId', select: 'name' }
    })
    .sort({ updatedAt: -1 });

    const me = await User.findById(req.user._id).select('mutedRooms');
    const mutedSet = new Set(me.mutedRooms.map(id => id.toString()));

    const enriched = await Promise.all(rooms.map(async r => {
      const rObj = r.toObject();
      rObj.participantIds = await filterRoomParticipants(req.user._id, rObj.participantIds || []);
      rObj.isMuted = mutedSet.has(r._id.toString());
      return rObj;
    }));

    res.json({ rooms: enriched });
  } catch (err) { next(err); }
};

exports.getRequests = async (req, res, next) => {
  try {
    const requests = await Room.find({
      participantIds: req.user._id,
      status: 'pending',
      requestedBy: { $ne: req.user._id }
    })
    .populate('participantIds', 'name avatar isOnline lastSeen bio username email privacy')
    .populate({
      path: 'lastMessage',
      populate: { path: 'senderId', select: 'name' }
    })
    .sort({ updatedAt: -1 });

    const filtered = await Promise.all(requests.map(async r => {
      const rObj = r.toObject();
      rObj.participantIds = await filterRoomParticipants(req.user._id, rObj.participantIds || []);
      return rObj;
    }));

    res.json({ requests: filtered });
  } catch (err) { next(err); }
};

exports.createRoom = async (req, res, next) => {
  try {
    const { participantIds, isGroup, groupName } = req.body;
    const all = [...new Set([...participantIds, req.user._id.toString()])];

    if (!isGroup) {
      const otherId = participantIds.find(id => id.toString() !== req.user._id.toString());
      if (otherId) {
        const [me, other] = await Promise.all([
          User.findById(req.user._id).select('blockedUsers'),
          User.findById(otherId).select('blockedUsers privacy')
        ]);
        const meBlocked    = me?.blockedUsers.map(id => id.toString()) || [];
        const otherBlocked = other?.blockedUsers.map(id => id.toString()) || [];
        if (meBlocked.includes(otherId.toString()) || otherBlocked.includes(req.user._id.toString())) {
          return res.status(403).json({ message: 'You cannot start a conversation with this user.' });
        }

        // Check messageMePrivacy
        const pf = await applyPrivacyRules(req.user._id, other);
        if (!pf.canMessage) {
          return res.status(403).json({ message: 'This user does not accept new messages.' });
        }
      }

      const existing = await Room.findOne({
        isGroup: false,
        participantIds: { $all: all, $size: 2 }
      }).populate('participantIds', 'name avatar isOnline lastSeen bio username email privacy');
      if (existing) {
        const rObj = existing.toObject();
        rObj.participantIds = await filterRoomParticipants(req.user._id, rObj.participantIds || []);
        return res.json({ room: rObj });
      }

      const room = await Room.create({
        participantIds: all,
        isGroup: false,
        createdBy: req.user._id,
        status: 'pending',
        requestedBy: req.user._id
      });
      await room.populate('participantIds', 'name avatar isOnline lastSeen bio username email privacy');
      const rObj = room.toObject();
      rObj.participantIds = await filterRoomParticipants(req.user._id, rObj.participantIds || []);
      return res.status(201).json({ room: rObj });
    }

    const room = await Room.create({
      participantIds: all,
      isGroup: true,
      groupName,
      createdBy: req.user._id,
      status: 'accepted'
    });
    await room.populate('participantIds', 'name avatar isOnline lastSeen bio username email privacy');

    if (req.io) {
      const otherMembers = room.participantIds.filter(
        p => p._id.toString() !== req.user._id.toString()
      );
      for (const member of otherMembers) {
        req.io.emit('receive_request', {
          roomId:     room._id.toString(),
          senderId:   req.user._id,
          senderName: req.user.name,
          receiverId: member._id.toString(),
          isGroup:    true,
          groupName:  room.groupName,
        });
      }
    }

    const rObj = room.toObject();
    rObj.participantIds = await filterRoomParticipants(req.user._id, rObj.participantIds || []);
    res.status(201).json({ room: rObj });
  } catch (err) { next(err); }
};

exports.acceptRequest = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    if (room.requestedBy?.toString() === req.user._id.toString())
      return res.status(403).json({ message: 'Cannot accept your own request' });

    if (!room.participantIds.map(id => id.toString()).includes(req.user._id.toString()))
      return res.status(403).json({ message: 'Not a participant' });

    room.status = 'accepted';
    await room.save();
    await room.populate('participantIds', 'name avatar isOnline lastSeen bio username email privacy');
    const rObj = room.toObject();
    rObj.participantIds = await filterRoomParticipants(req.user._id, rObj.participantIds || []);
    res.json({ room: rObj });
  } catch (err) { next(err); }
};

exports.rejectRequest = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    if (!room.participantIds.map(id => id.toString()).includes(req.user._id.toString()))
      return res.status(403).json({ message: 'Not a participant' });

    await Message.deleteMany({ roomId: room._id });
    await room.deleteOne();
    res.json({ message: 'Request rejected' });
  } catch (err) { next(err); }
};

exports.getRoomById = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.roomId)
      .populate('participantIds', 'name avatar isOnline bio lastSeen username email privacy')
      .populate('createdBy', 'name');
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const me = await User.findById(req.user._id).select('mutedRooms');
    const isMuted = me.mutedRooms.map(id => id.toString()).includes(room._id.toString());

    const rObj = room.toObject();
    rObj.participantIds = await filterRoomParticipants(req.user._id, rObj.participantIds || []);
    res.json({ room: { ...rObj, isMuted } });
  } catch (err) { next(err); }
};

exports.getRoomMedia = async (req, res, next) => {
  try {
    const messages = await Message.find({
      roomId: req.params.roomId,
      type: { $in: ['image', 'file'] },
      isDeleted: { $ne: true }
    })
    .populate('senderId', 'name')
    .sort({ createdAt: -1 })
    .limit(50);

    const images    = messages.filter(m => m.type === 'image');
    const documents = messages.filter(m => m.type === 'file');

    res.json({ media: images, documents });
  } catch (err) { next(err); }
};

exports.clearChat = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    if (!room.participantIds.map(id => id.toString()).includes(req.user._id.toString()))
      return res.status(403).json({ message: 'Not a participant' });

    await Message.deleteMany({ roomId: req.params.roomId });
    res.json({ message: 'Chat cleared' });
  } catch (err) { next(err); }
};

exports.leaveRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (!room.isGroup) return res.status(400).json({ message: 'Cannot leave a DM' });

    const userId = req.user._id.toString();
    if (!room.participantIds.map(id => id.toString()).includes(userId))
      return res.status(403).json({ message: 'Not a participant' });

    room.participantIds = room.participantIds.filter(id => id.toString() !== userId);

    if (room.participantIds.length === 0) {
      await Message.deleteMany({ roomId: room._id });
      await room.deleteOne();
      return res.json({ message: 'Group deleted (no members left)' });
    }

    await room.save();
    res.json({ message: 'Left the group' });
  } catch (err) { next(err); }
};

exports.muteRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const me = await User.findById(req.user._id).select('mutedRooms');
    const alreadyMuted = me.mutedRooms.map(id => id.toString()).includes(req.params.roomId);

    if (alreadyMuted) {
      await User.findByIdAndUpdate(req.user._id, { $pull: { mutedRooms: req.params.roomId } });
      return res.json({ message: 'Room unmuted', isMuted: false });
    }

    await User.findByIdAndUpdate(req.user._id, { $addToSet: { mutedRooms: req.params.roomId } });
    res.json({ message: 'Room muted', isMuted: true });
  } catch (err) { next(err); }
};

exports.reportRoom = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const existing = await Report.findOne({
      reportedBy: req.user._id,
      targetType: 'group',
      targetId:   req.params.roomId
    });
    if (existing) return res.json({ message: 'Already reported' });

    await Report.create({
      reportedBy: req.user._id,
      targetType: 'group',
      targetId:   req.params.roomId,
      reason:     reason || 'No reason provided'
    });
    res.json({ message: 'Report submitted. Thank you.' });
  } catch (err) { next(err); }
};

// POST /api/groups/create
exports.createGroup = async (req, res, next) => {
  try {
    const { groupName, description, memberIds } = req.body;

    if (!groupName || !groupName.trim()) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const rawIds = Array.isArray(memberIds) ? memberIds : [];

    // ── Privacy check: filter out users who don't allow group additions ──
    const blockedIds = [];
    await Promise.all(rawIds.map(async (memberId) => {
      if (memberId.toString() === req.user._id.toString()) return;
      const member = await User.findById(memberId).select('privacy');
      if (!member) return;
      const pf = await applyPrivacyRules(req.user._id, member);
      if (!pf.canAddToGroup) {
        blockedIds.push(memberId.toString());
      }
    }));

    if (blockedIds.length > 0) {
      return res.status(403).json({
        message: 'One or more selected users do not allow being added to groups.',
        blockedIds,
      });
    }

    const allIds = [...new Set([req.user._id.toString(), ...rawIds])];

    let avatarUrl = null;
    if (req.file) {
      avatarUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    const room = await Room.create({
      participantIds: allIds,
      isGroup:     true,
      groupName:   groupName.trim(),
      description: description?.trim() || '',
      avatarUrl,
      createdBy:   req.user._id,
      status:      'accepted',
    });

    await room.populate('participantIds', 'name avatar isOnline lastSeen bio username email privacy');
    const rObj = room.toObject();
    rObj.participantIds = await filterRoomParticipants(req.user._id, rObj.participantIds || []);
    res.status(201).json({ room: rObj });
  } catch (err) { next(err); }
};