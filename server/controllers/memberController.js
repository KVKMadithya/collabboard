const User = require('../models/User');
const Notification = require('../models/Notification');

// Fetch all users who are actually part of the workspace (assuming they have a role set, adjust logic as needed for your DB)
exports.getMembers = async (req, res) => {
  try {
    // For now, fetching all users to simulate the team. In production, filter by { workspaceId } or { isMember: true }
    const members = await User.find().select('-password');
    res.status(200).json(members);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch members", error });
  }
};

// GitHub-style search for users by email or name
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(200).json([]);

    // Search for users where email or name matches the query string (case-insensitive)
    const users = await User.find({
      $or: [
        { email: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } }
      ]
    }).select('name email _id').limit(5); // Limit to 5 results for the dropdown

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Search failed", error });
  }
};

// Send an invite
exports.sendInvite = async (req, res) => {
  try {
    const { recipientId, roleOffered } = req.body;
    
    // Check if an invite is already pending
    const existingInvite = await Notification.findOne({
      recipient: recipientId,
      sender: req.user.id, // Assumes you have an auth middleware passing req.user
      status: 'pending'
    });

    if (existingInvite) {
      return res.status(400).json({ message: "An invite is already pending for this user." });
    }

    const invite = new Notification({
      recipient: recipientId,
      sender: req.user.id,
      type: 'invite',
      roleOffered
    });

    await invite.save();
    res.status(201).json({ message: "Invite sent successfully!", invite });
  } catch (error) {
    res.status(500).json({ message: "Failed to send invite", error });
  }
};