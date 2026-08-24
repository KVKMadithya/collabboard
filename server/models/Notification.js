const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['invite', 'alert'], default: 'invite' },
  roleOffered: { type: String, enum: ['Admin', 'Editor', 'Viewer'], default: 'Editor' },
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);