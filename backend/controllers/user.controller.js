const User   = require('../models/User');
const Report = require('../models/Report');
const Room   = require('../models/Room');
const Message = require('../models/Message');

// ── Privacy helper ────────────────────────────────────────────────────────────
// Returns true when `viewerId` is an accepted contact of `targetUser`
// (i.e. they share at least one accepted DM room).
async function isContact(viewerId, targetUserId) {
  const room = await Room.findOne({
    isGroup: false,
    participantIds: { $all: [viewerId, targetUserId] },
    status: 'accepted',
  });
  return !!room;
}

// Applies a user's privacy settings to the fields we expose.
// `viewer` is the requesting user's _id (string or ObjectId).
// `target` is the full User document (must include `.privacy`).
async function applyPrivacy(viewerIdRaw, target) {
  const viewerId   = viewerIdRaw?.toString();
  const targetId   = target._id?.toString();
  const isSelf     = viewerId === targetId;
  const privacy    = target.privacy || {};

  // Owner always sees full data
  if (isSelf) {
    return {
      avatar:    target.avatar,
      isOnline:  target.isOnline,
      lastSeen:  target.lastSeen,
    };
  }

  const contact = await isContact(viewerId, target._id);

  const canSee = (setting) => {
    if (setting === 'everyone') return true;
    if (setting === 'accepted') return contact;
    return false; // 'nobody'
  };

  return {
    avatar:   canSee(privacy.profilePhoto) ? target.avatar : null,
    isOnline: canSee(privacy.onlineStatus) ? target.isOnline : null,  // null = hidden
    lastSeen: canSee(privacy.lastSeen)     ? target.lastSeen : null,
  };
}


// GET /api/users/search
exports.searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) return res.json({ users: [] });

    const users = await User.find({
      $or: [
        { name:  { $regex: q.trim(), $options: 'i' } },
        { email: { $regex: q.trim(), $options: 'i' } }
      ],
      _id: { $ne: req.user._id }
    })
    .select('name email avatar isOnline bio lastSeen username statusValue customStatus')
    .limit(20);

    const filtered = await Promise.all(users.map(async u => {
      const pf = await applyPrivacy(req.user._id, u);
      return {
        id:           u._id,
        name:         u.name,
        email:        u.email,
        avatar:       pf.avatar,
        isOnline:     pf.isOnline,
        bio:          u.bio,
        lastSeen:     pf.lastSeen,
        username:     u.username,
        statusValue:  u.statusValue,
        customStatus: u.customStatus,
      };
    }));
    res.json({ users: filtered });
  } catch (err) { next(err); }
};

// GET /api/users
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('name email avatar isOnline bio lastSeen username statusValue customStatus')
      .limit(50)
      .sort({ name: 1 });

    const filtered = await Promise.all(users.map(async u => {
      const pf = await applyPrivacy(req.user._id, u);
      return {
        id:           u._id,
        name:         u.name,
        email:        u.email,
        avatar:       pf.avatar,
        isOnline:     pf.isOnline,
        bio:          u.bio,
        lastSeen:     pf.lastSeen,
        username:     u.username,
        statusValue:  u.statusValue,
        customStatus: u.customStatus,
      };
    }));
    res.json({ users: filtered });
  } catch (err) { next(err); }
};

// GET /api/users/:userId
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('name email avatar isOnline bio lastSeen createdAt username statusValue customStatus privacy');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const me = await User.findById(req.user._id).select('blockedUsers mutedUsers');
    const isBlocked    = me.blockedUsers.map(id => id.toString()).includes(user._id.toString());
    const isMuted      = me.mutedUsers.map(id => id.toString()).includes(user._id.toString());
    const otherUser    = await User.findById(user._id).select('blockedUsers');
    const hasBlockedMe = otherUser.blockedUsers.map(id => id.toString()).includes(req.user._id.toString());

    const privacyFiltered = await applyPrivacy(req.user._id, user);

    res.json({
      user: {
        id:           user._id,
        name:         user.name,
        email:        user.email,
        avatar:       privacyFiltered.avatar,
        isOnline:     privacyFiltered.isOnline,
        bio:          user.bio,
        lastSeen:     privacyFiltered.lastSeen,
        memberSince:  user.createdAt,
        createdAt:    user.createdAt,
        username:     user.username,
        statusValue:  user.statusValue,
        customStatus: user.customStatus,
        isBlocked,
        isMuted,
        hasBlockedMe
      }
    });
  } catch (err) { next(err); }
};

// PUT /api/users/me
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, bio, avatar, username, statusValue, customStatus } = req.body;

    const updateFields = {};
    if (name  !== undefined) updateFields.name  = name;
    if (bio   !== undefined) updateFields.bio   = bio;
    if (avatar !== undefined) updateFields.avatar = avatar;
    if (username !== undefined) updateFields.username = username;
    if (statusValue !== undefined) updateFields.statusValue = statusValue;
    if (customStatus !== undefined) updateFields.customStatus = customStatus;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateFields,
      { new: true, runValidators: true }
    ).select('-password');

    const payload = {
      id:           user._id,
      name:         user.name,
      email:        user.email,
      avatar:       user.avatar,
      bio:          user.bio,
      role:         user.role,
      username:     user.username,
      statusValue:  user.statusValue,
      customStatus: user.customStatus,
      isOnline:     user.isOnline,
      lastSeen:     user.lastSeen,
      createdAt:    user.createdAt,
      privacy:      user.privacy || {},
    };

    // Broadcast profile change to all connected clients so
    // other users see the updated avatar/name in real time
    const io = req.app.get('io');
    if (io) {
      io.emit('user_profile_updated', {
        userId: user._id.toString(),
        name:   user.name,
        avatar: user.avatar,
        username: user.username,
        statusValue: user.statusValue,
        customStatus: user.customStatus,
      });
    }

    res.json({ user: payload });
  } catch (err) { next(err); }
};

// PUT /api/users/me/privacy
// FIX: Added readReceipts and typingIndicator — previously these were sent from
// the frontend but silently ignored here, so changes were never persisted to DB.
exports.updatePrivacy = async (req, res, next) => {
  try {
    const {
      profilePhoto, lastSeen, onlineStatus, addToGroups, messages,
      readReceipts, typingIndicator,         // ← FIX: handle these fields
    } = req.body;

    const privacyUpdate = {};
    if (profilePhoto     !== undefined) privacyUpdate['privacy.profilePhoto']    = profilePhoto;
    if (lastSeen         !== undefined) privacyUpdate['privacy.lastSeen']         = lastSeen;
    if (onlineStatus     !== undefined) privacyUpdate['privacy.onlineStatus']     = onlineStatus;
    if (addToGroups      !== undefined) privacyUpdate['privacy.addToGroups']      = addToGroups;
    if (messages         !== undefined) privacyUpdate['privacy.messages']         = messages;
    if (readReceipts     !== undefined) privacyUpdate['privacy.readReceipts']     = readReceipts;     // ← FIX
    if (typingIndicator  !== undefined) privacyUpdate['privacy.typingIndicator']  = typingIndicator;  // ← FIX

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: privacyUpdate },
      { new: true }
    ).select('privacy');

    const fullUser = await User.findById(req.user._id)
      .select('name email avatar role username bio statusValue customStatus isOnline lastSeen createdAt privacy');
    res.json({
      privacy: user.privacy,
      message: 'Privacy settings updated',
      user: {
        id:           fullUser._id,
        name:         fullUser.name,
        email:        fullUser.email,
        avatar:       fullUser.avatar,
        role:         fullUser.role,
        username:     fullUser.username,
        bio:          fullUser.bio          || '',
        statusValue:  fullUser.statusValue  || 'available',
        customStatus: fullUser.customStatus || '',
        isOnline:     fullUser.isOnline,
        lastSeen:     fullUser.lastSeen,
        createdAt:    fullUser.createdAt,
        privacy:      fullUser.privacy || {},
      }
    });
  } catch (err) { next(err); }
};

// GET /api/users/me/stats
exports.getUserStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Message model uses `senderId`, Room model uses `participantIds`
    const messagesSent = await Message.countDocuments({ senderId: userId });

    const groupsJoined = await Room.countDocuments({
      isGroup: true,
      participantIds: userId
    });

    const sharedMessages = await Message.find({
      senderId: userId,
      type: { $in: ['file', 'document', 'image', 'video', 'audio', 'gif'] }
    }).select('type');

    const filesShared = sharedMessages.filter(m => ['file', 'document', 'audio'].includes(m.type)).length;
    const mediaShared = sharedMessages.filter(m => ['image', 'video', 'gif'].includes(m.type)).length;

    res.json({ messagesSent, groupsJoined, filesShared, mediaShared });
  } catch (err) { next(err); }
};

// GET /api/users/me/blocked
exports.getBlockedUsers = async (req, res, next) => {
  try {
    const me = await User.findById(req.user._id)
      .select('blockedUsers')
      .populate('blockedUsers', 'name email avatar username');

    const users = (me.blockedUsers || []).map(u => ({
      id:       u._id,
      name:     u.name,
      email:    u.email,
      avatar:   u.avatar,
      username: u.username,
    }));

    res.json({ users });
  } catch (err) { next(err); }
};

// POST /api/users/:userId/block
exports.blockUser = async (req, res, next) => {
  try {
    const me = await User.findById(req.user._id).select('blockedUsers');
    const targetId = req.params.userId;
    const alreadyBlocked = me.blockedUsers.map(id => id.toString()).includes(targetId);

    if (alreadyBlocked) {
      await User.findByIdAndUpdate(req.user._id, { $pull: { blockedUsers: targetId } });
      return res.json({ message: 'User unblocked', isBlocked: false });
    }

    await User.findByIdAndUpdate(req.user._id, { $addToSet: { blockedUsers: targetId } });
    res.json({ message: 'User blocked', isBlocked: true });
  } catch (err) { next(err); }
};

// POST /api/users/:userId/report
exports.reportUser = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const existing = await Report.findOne({
      reportedBy: req.user._id, targetType: 'user', targetId: req.params.userId
    });
    if (existing) return res.json({ message: 'Already reported' });

    await Report.create({
      reportedBy: req.user._id, targetType: 'user',
      targetId: req.params.userId, reason: reason || 'No reason provided'
    });
    res.json({ message: 'Report submitted. Thank you.' });
  } catch (err) { next(err); }
};

// POST /api/users/:userId/mute
exports.muteUser = async (req, res, next) => {
  try {
    const me = await User.findById(req.user._id).select('mutedUsers');
    const targetId = req.params.userId;
    const alreadyMuted = me.mutedUsers.map(id => id.toString()).includes(targetId);

    if (alreadyMuted) {
      await User.findByIdAndUpdate(req.user._id, { $pull: { mutedUsers: targetId } });
      return res.json({ message: 'User unmuted', isMuted: false });
    }

    await User.findByIdAndUpdate(req.user._id, { $addToSet: { mutedUsers: targetId } });
    res.json({ message: 'User muted', isMuted: true });
  } catch (err) { next(err); }
};