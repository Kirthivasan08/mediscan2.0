const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false, minlength: 6 },
    avatar:   { type: String, default: '' },

    role: {
      type: String,
      enum: ['patient','doctor','pharmacist','admin'],
      default: 'patient',
    },
    provider:   { type: String, enum: ['local','google','github'], default: 'local' },
    googleId:   { type: String, sparse: true },
    githubId:   { type: String, sparse: true },
    isVerified: { type: Boolean, default: false },
    isActive:   { type: Boolean, default: true },

    // Patient-specific
    patientId:   { type: String, unique: true, sparse: true },
    dateOfBirth: { type: Date },
    gender:      { type: String, enum: ['male','female','other'] },
    bloodGroup:  { type: String },
    contact:     { type: String },
    address:     { type: String },
    allergies:   [{ type: String }],

    medicalHistory: [{
      condition:   String,
      diagnosedOn: Date,
      hospital:    String,
      doctor:      String,
      notes:       String,
    }],

    emergencyContact: {
      name:     String,
      phone:    String,
      relation: String,
    },

    qrCode:     { type: String },
    qrCodeData: { type: String },

    scanHistory:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'ScanLog' }],
    savedMedicines: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' }],

    // Doctor-specific
    specialization:    { type: String },
    licenseNumber:     { type: String },
    hospital:          { type: String },
    yearsOfExperience: { type: Number },
  },
  { timestamps: true }
);

// ── Hash password ────────────────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Auto-generate patientId (BUG FIX: atomic counter to prevent race condition) ──
userSchema.pre('save', async function (next) {
  if (!this.isNew || this.patientId || this.role !== 'patient') return next();
  try {
    const Counter = mongoose.model('Counter');
    const counter = await Counter.findOneAndUpdate(
      { _id: 'patientId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.patientId = `PAT${String(counter.seq).padStart(5, '0')}`;
    next();
  } catch (err) {
    this.patientId = `PAT${Date.now()}`;
    next();
  }
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// ── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ patientId: 1 }, { sparse: true });
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ githubId: 1 }, { sparse: true });
userSchema.index({ savedMedicines: 1 });   // for cron expiry alert lookup

module.exports = mongoose.model('User', userSchema);
