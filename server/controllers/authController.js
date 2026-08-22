const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.register = async (req, res) => {
  try {
    // 👇 Destructure the new fields from the request
    const { firstName, lastName, email, password, role, university } = req.body;
    
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    // 👇 Save them to the database
    const user = await User.create({ firstName, lastName, email, password, role, university });
    res.status(201).json({ token: generateToken(user._id) });
  } catch (error) {
    console.error("🚨 REGISTRATION CRASH REPORT:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    
    // 👇 Added user.password check to prevent crashes if a Google user uses this form
    if (user && user.password && (await user.matchPassword(password))) {
      res.json({ token: generateToken(user._id) });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.googleAuth = async (req, res) => {
  try {
    const { access_token } = req.body;
    
    // Fetch user profile from Google
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    
    if (!response.ok) {
        return res.status(400).json({ message: 'Failed to fetch user from Google' });
    }
    
    const profile = await response.json();

    // Find or create the user in MongoDB
    let user = await User.findOne({ email: profile.email });
    if (!user) {
      user = await User.create({
        firstName: profile.given_name,
        lastName: profile.family_name,
        email: profile.email
      });
    }

    // Issue our own JWT using the generateToken helper at the top of the file
    res.status(200).json({ token: generateToken(user._id) });
  } catch (error) {
    // 👇 Crash report logger added here
    console.error("🚨 GOOGLE AUTH CRASH REPORT:", error);
    res.status(500).json({ message: 'Google Authentication Failed on Server' });
  }
};

// Add this at the bottom of authController.js
exports.getMe = async (req, res) => {
  try {
    // req.user was securely attached by our middleware
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.firstName = req.body.firstName || user.firstName;
      user.lastName = req.body.lastName || user.lastName;
      user.role = req.body.role || user.role;
      user.university = req.body.university || user.university;
      if (req.body.profilePic) user.profilePic = req.body.profilePic;

      const updatedUser = await user.save();
      res.json(updatedUser);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error("🚨 PROFILE UPDATE CRASH:", error);
    res.status(500).json({ message: 'Server error' });
  }
};