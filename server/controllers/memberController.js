const User = require('../models/User');
const Notification = require('../models/Notification');
const Project = require('../models/Project');

// 1. FETCH MEMBERS OF A SPECIFIC PROJECT
exports.getMembers = async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ message: "Project ID is required." });

    // 🛑 FIX: Populate firstName and lastName
    const project = await Project.findById(projectId).populate('members.user', 'firstName lastName email profilePic university');
    if (!project) return res.status(404).json({ message: "Project not found." });

    const formattedMembers = project.members.map(m => {
      // Stitch names together for the frontend
      const fullName = m.user.firstName ? `${m.user.firstName} ${m.user.lastName || ''}`.trim() : 'Unknown User';
      
      return {
        _id: m.user._id,
        name: fullName, // React expects 'name'
        email: m.user.email,
        profilePic: m.user.profilePic,
        university: m.user.university, 
        role: m.role,
        joinedAt: m.joinedAt
      };
    });

    res.status(200).json(formattedMembers);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch members", error: error.message });
  }
};

// 2. LIVE GITHUB-STYLE SEARCH
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(200).json([]);

    // 🛑 FIX: Search firstName and lastName instead of 'name'
    const users = await User.find({
      $or: [
        { email: { $regex: q, $options: 'i' } },
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } }
      ]
    }).select('firstName lastName email _id profilePic university').limit(5);

    // Format for the frontend
    const formattedUsers = users.map(u => ({
      _id: u._id,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
      email: u.email,
      profilePic: u.profilePic,
      university: u.university
    }));

    res.status(200).json(formattedUsers);
  } catch (error) {
    res.status(500).json({ message: "Search failed", error: error.message });
  }
};

// 3. SEND A PROJECT INVITE
exports.sendInvite = async (req, res) => {
  try {
    const { recipientId, roleOffered, projectId } = req.body;

    if (!projectId) return res.status(400).json({ message: "Project ID is required." });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found." });

    if (project.leader.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied. Only the project leader can send invites." });
    }

    const isAlreadyMember = project.members.some(m => m.user.toString() === recipientId);
    if (isAlreadyMember) {
      return res.status(400).json({ message: "User is already a member of this project." });
    }

    const existingInvite = await Notification.findOne({
      recipient: recipientId,
      project: projectId,
      status: 'pending'
    });

    if (existingInvite) {
      return res.status(400).json({ message: "An invite is already pending for this user." });
    }

    const invite = new Notification({
      recipient: recipientId,
      sender: req.user.id,
      project: projectId,
      type: 'invite',
      roleOffered
    });

    await invite.save();
    res.status(201).json({ message: "Invite sent successfully!", invite });
  } catch (error) {
    res.status(500).json({ message: "Failed to send invite", error: error.message });
  }
};

// 4. FETCH NOTIFICATIONS
exports.getNotifications = async (req, res) => {
  try {
    // 🛑 FIX: Populate firstName and lastName for the notification sender
    const notifications = await Notification.find({ recipient: req.user.id })
      .populate('sender', 'firstName lastName profilePic')
      .populate('project', 'name')
      .sort({ createdAt: -1 });

    const formattedNotifs = notifications.map(notif => {
      const notifObj = notif.toObject();
      if (notifObj.sender) {
        notifObj.sender.name = `${notifObj.sender.firstName || ''} ${notifObj.sender.lastName || ''}`.trim() || 'Someone';
      }
      return notifObj;
    });

    res.status(200).json(formattedNotifs);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notifications", error: error.message });
  }
};

// 5. ACCEPT OR DECLINE INVITE
exports.respondToInvite = async (req, res) => {
  try {
    const { action } = req.body; 
    const notification = await Notification.findById(req.params.id);

    if (!notification) return res.status(404).json({ message: "Notification not found" });
    
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized action." });
    }

    notification.status = action === 'accept' ? 'accepted' : 'declined';
    notification.read = true;
    await notification.save();

    if (action === 'accept') {
      const project = await Project.findById(notification.project);
      if (project) {
        const alreadyMember = project.members.some(m => m.user.toString() === req.user.id);
        if (!alreadyMember) {
          project.members.push({
            user: req.user.id,
            role: notification.roleOffered
          });
          await project.save();
        }
      }
    }

    res.status(200).json({ message: `Invite ${notification.status}`, notification });
  } catch (error) {
    res.status(500).json({ message: "Failed to update invite", error: error.message });
  }
};

// 6. UPDATE MEMBER ROLE (LEADER ONLY)
exports.updateMemberRole = async (req, res) => {
  try {
    const { projectId, memberId, newRole } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found." });

    if (project.leader.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied. Only the leader can manage roles." });
    }

    const memberIndex = project.members.findIndex(m => m.user.toString() === memberId);
    if (memberIndex === -1) {
      return res.status(404).json({ message: "Member not found in this project." });
    }

    if (project.leader.toString() === memberId) {
      return res.status(400).json({ message: "The leader's role cannot be modified." });
    }

    project.members[memberIndex].role = newRole;
    await project.save();

    res.status(200).json({ message: "Role updated successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to update role", error: error.message });
  }
};