const User = require('../models/User');
const Notification = require('../models/Notification'); 

// 1. Get Public Profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found in database' });
    }

    const isFollowedByMe = user.followers?.includes(req.user._id);
    const myRatingObj = user.ratings?.find(r => r.rater.toString() === req.user._id.toString());
    const myRating = myRatingObj ? myRatingObj.score : 0;
    
    const totalScore = user.ratings?.reduce((acc, curr) => acc + curr.score, 0) || 0;
    const averageRating = user.ratings && user.ratings.length > 0 
        ? (totalScore / user.ratings.length).toFixed(1) 
        : "0.0";

    const userProfile = {
      _id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
      university: user.university,
      profilePic: user.profilePic,
      stats: {
        rating: averageRating,
        tasksCompleted: user.stats?.tasksCompleted || 0,
        followers: user.followers?.length || 0
      },
      isFollowedByMe,
      myRating
    };

    res.status(200).json(userProfile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: 'Server error fetching user profile' });
  }
};

// 2. Toggle Follow / Unfollow
exports.toggleFollow = async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user._id);

    if (!targetUser) return res.status(404).json({ message: "User not found" });
    if (targetUser._id.toString() === currentUser._id.toString()) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    // Safety initialization
    if (!targetUser.followers) targetUser.followers = [];
    if (!currentUser.following) currentUser.following = [];

    const isFollowing = targetUser.followers.includes(currentUser._id);

    if (isFollowing) {
      targetUser.followers.pull(currentUser._id);
      currentUser.following.pull(targetUser._id);
    } else {
      targetUser.followers.push(currentUser._id);
      currentUser.following.push(targetUser._id);

      // 🚀 Anti-Spam: Remove previous unread follow notifications from this user
      await Notification.deleteMany({
        recipient: targetUser._id,
        sender: currentUser._id,
        type: 'follow'
      });

      // 🚀 Fire Database Notification
      await Notification.create({
        recipient: targetUser._id,
        sender: currentUser._id,
        type: 'follow',
        status: 'info', // 👈 Mark as info so it bypasses invite logic
        message: `${currentUser.firstName} ${currentUser.lastName} started following you.`
      });
    }

    await targetUser.save();
    await currentUser.save();

    res.status(200).json({ 
      isFollowing: !isFollowing, 
      followersCount: targetUser.followers.length 
    });
  } catch (error) {
    console.error("Error toggling follow:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 3. Rate a User
exports.rateUser = async (req, res) => {
  try {
    const { rating } = req.body;
    const targetUser = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user._id);

    if (!targetUser) return res.status(404).json({ message: "User not found" });
    if (targetUser._id.toString() === currentUser._id.toString()) {
      return res.status(400).json({ message: "You cannot rate yourself" });
    }

    if (!targetUser.ratings) targetUser.ratings = [];

    const existingIndex = targetUser.ratings.findIndex(r => r.rater.toString() === currentUser._id.toString());
    if (existingIndex >= 0) {
      targetUser.ratings[existingIndex].score = rating;
    } else {
      targetUser.ratings.push({ rater: currentUser._id, score: rating });
    }

    await targetUser.save();

    const totalScore = targetUser.ratings.reduce((acc, curr) => acc + curr.score, 0);
    const averageRating = (totalScore / targetUser.ratings.length).toFixed(1);

    // 🚀 Anti-Spam: Remove previous unread rating notifications
    await Notification.deleteMany({
      recipient: targetUser._id,
      sender: currentUser._id,
      type: 'rating'
    });

    // 🚀 Fire Database Notification
    await Notification.create({
      recipient: targetUser._id,
      sender: currentUser._id,
      type: 'rating',
      status: 'info', // 👈 Mark as info
      message: `${currentUser.firstName} ${currentUser.lastName} rated your profile ${rating} stars.`
    });

    res.status(200).json({ averageRating, myRating: rating });
  } catch (error) {
    console.error("Error rating user:", error);
    res.status(500).json({ message: "Server error" });
  }
};