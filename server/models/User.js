const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: false },
  lastName: { type: String, required: false },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  role: { type: String, default: 'Member' }, 
  university: { type: String, default: '' },  
  profilePic: { type: String, default: '' },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  ratings: [{
    rater: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    score: { type: Number, required: true }
  }],
  
  // ⭐ NEW: Future-proofed arrays to build the ultimate /starred dashboard
  starredTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  starredNotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Note' }],
  starredReports: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ReportModule' }],

  preferences: {
    accentColor: { type: String, default: '#FF2D88' },
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'Asia/Colombo (GMT+5:30)' },
    customGreeting: { type: String, default: 'How can I help with your board today?' },
    responseStyle: { type: String, default: 'Concise' },
    defaultShareRole: { type: String, default: 'view' },
    twoFactorEnabled: { type: Boolean, default: false },
    pinSidebarByDefault: { type: Boolean, default: false }
  }
}, { timestamps: true });

// Hash the password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);