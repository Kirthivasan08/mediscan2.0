const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName:   { type: String },
    userRole:   { type: String },
    action:     { type: String, required: true },  // CREATE_MEDICINE, UPDATE_MEDICINE, DELETE_USER, etc.
    entity:     { type: String },                  // Medicine, User, Treatment
    entityId:   { type: mongoose.Schema.Types.ObjectId },
    entityName: { type: String },
    changes:    { type: mongoose.Schema.Types.Mixed }, // what changed (before/after)
    ipAddress:  { type: String },
    userAgent:  { type: String },
    status:     { type: String, enum: ['success','failed'], default: 'success' },
    note:       { type: String },
  },
  { timestamps: true }
);

auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
