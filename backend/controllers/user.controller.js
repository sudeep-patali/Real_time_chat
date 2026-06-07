const User   = require('../models/User');
const Report = require('../models/Report');

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
    .select('name email avatar isOnline bio lastSeen')
    .limit(20);

    res.json({
      users: users.map(u => ({
        id:       u._id,
        name:     u.name,
        email:    u.email,
        avatar:   u.avatar,
        isOnline: u.isOnline,
        bio:      u.bio,
        lastSeen: u.lastSeen
      }))
    });
  } catch (err) { next(err); }
};

// GET /api/users
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('name email avatar isOnline bio lastSeen')
      .limit(50)
      .sort({ name: 1 });

    res.json({
      users: users.map(u => ({
        id:       u._id,
        name:     u.name,
        email:    u.email,
        avatar:   u.avatar,
        isOnline: u.isOnline,
        bio:      u.bio,
        lastSeen: u.lastSeen
      }))
    });
  } catch (err) { next(err); }
};

// GET /api/users/:userId
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('name email avatar isOnline bio lastSeen createdAt');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if current user has blocked this user, and if this user has blocked current user
    const me = await User.findById(req.user._id).select('blockedUsers mutedUsers');
    const isBlocked    = me.blockedUsers.map(id => id.toString()).includes(user._id.toString());
    const isMuted      = me.mutedUsers.map(id => id.toString()).includes(user._id.toString());
    // Check if the other user has blocked the current user
    const otherUser    = await User.findById(user._id).select('blockedUsers');
    const hasBlockedMe = otherUser.blockedUsers.map(id => id.toString()).includes(req.user._id.toString());

    res.json({
      user: {
        id:          user._id,
        name:        user.name,
        email:       user.email,
        avatar:      user.avatar,
        isOnline:    user.isOnline,
        bio:         user.bio,
        lastSeen:    user.lastSeen,
        memberSince: user.createdAt,
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
    const { name, bio, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, bio, avatar },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      user: {
        id:     user._id,
        name:   user.name,
        email:  user.email,
        avatar: user.avatar,
        bio:    user.bio,
        role:   user.role
      }
    });
  } catch (err) { next(err); }
};

// POST /api/users/:userId/block
exports.blockUser = async (req, res, next) => {
  try {
    const me = await User.findById(req.user._id).select('blockedUsers');
    const targetId = req.params.userId;
    const alreadyBlocked = me.blockedUsers.map(id => id.toString()).includes(targetId);

    if (alreadyBlocked) {
      // Unblock
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { blockedUsers: targetId }
      });
      return res.json({ message: 'User unblocked', isBlocked: false });
    }

    // Block
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: targetId }
    });
    res.json({ message: 'User blocked', isBlocked: true });
  } catch (err) { next(err); }
};

// POST /api/users/:userId/report
exports.reportUser = async (req, res, next) => {
  try {
    const { reason } = req.body;

    // Prevent duplicate report from same user
    const existing = await Report.findOne({
      reportedBy: req.user._id,
      targetType: 'user',
      targetId:   req.params.userId
    });
    if (existing) return res.json({ message: 'Already reported' });

    await Report.create({
      reportedBy: req.user._id,
      targetType: 'user',
      targetId:   req.params.userId,
      reason:     reason || 'No reason provided'
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
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { mutedUsers: targetId }
      });
      return res.json({ message: 'User unmuted', isMuted: false });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { mutedUsers: targetId }
    });
    res.json({ message: 'User muted', isMuted: true });
  } catch (err) { next(err); }
};