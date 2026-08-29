const mongoose = require('mongoose');

// A single uploaded file (Project Proposal or Final Report).
// Everyone signed in can view/rename/delete/replace these — no ownership lock.
const fileSubSchema = new mongoose.Schema({
  name: { type: String, required: true },        // display name — editable via rename
  originalName: { type: String },                 // name the file had when uploaded
  filePath: { type: String, required: true },     // served via /uploads/<filename>
  size: { type: Number, default: 0 },              // bytes
  mimeType: { type: String },
  uploadedByName: { type: String, default: '' },   // who uploaded it, for display only
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const reportModuleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  color: { type: String, default: '#A855F7' },
  requireFinal: { type: Boolean, default: true },
  proposal: { type: fileSubSchema, default: null },
  finalReport: { type: fileSubSchema, default: null },
}, { timestamps: true });

module.exports = mongoose.model('ReportModule', reportModuleSchema);