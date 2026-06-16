const mongoose = require('mongoose');

const treatmentSchema = new mongoose.Schema(
  {
    patient:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctor:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    doctorName: { type: String },
    hospital:   { type: String },

    disease:  { type: String, required: true, trim: true },
    type:     { type: String, enum: ['chronic','surgery','infection','injury','other'], default: 'other' },
    severity: { type: String, enum: ['mild','moderate','severe'], default: 'mild' },
    notes:    { type: String },

    startDate: { type: Date, default: Date.now },
    endDate:   { type: Date },
    status:    { type: String, enum: ['ongoing','recovered','stopped','follow_up'], default: 'ongoing' },

    prescriptions: [{
      medicine:     { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
      medicineName: { type: String, required: true, trim: true },
      dosage:       { type: String },
      frequency:    { type: String },
      duration:     { type: String },
      instructions: { type: String },
      status:       { type: String, enum: ['active','completed','stopped'], default: 'active' },
    }],

    visits: [{
      date:  { type: Date, default: Date.now },
      notes: { type: String },
      vitals: {
        bp:          String,
        pulse:       Number,
        temperature: Number,
        weight:      Number,
        height:      Number,
      },
    }],

    attachments: [{ name: String, url: String }],
  },
  { timestamps: true }
);

// ── Validation: endDate must be >= startDate ────────────────────────────────
treatmentSchema.pre('save', function (next) {
  if (this.endDate && this.startDate && this.endDate < this.startDate) {
    return next(new Error('End date cannot be before start date.'));
  }
  next();
});

// ── Indexes ────────────────────────────────────────────────────────────────
treatmentSchema.index({ patient: 1, status: 1 });
treatmentSchema.index({ doctor:  1, createdAt: -1 });
treatmentSchema.index({ patient: 1, createdAt: -1 });

module.exports = mongoose.model('Treatment', treatmentSchema);
