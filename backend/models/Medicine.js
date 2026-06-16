const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    medicineId:   { type: String, unique: true },
    name:         { type: String, required: true, trim: true },
    genericName:  { type: String, trim: true },
    brand:        { type: String, trim: true },
    manufacturer: { type: String, trim: true },
    batchNumber:  { type: String, trim: true },
    barcode:      { type: String, sparse: true },

    category: {
      type: String,
      enum: ['antibiotic','analgesic','antiviral','antifungal','cardiovascular',
             'diabetes','neurological','respiratory','gastrointestinal',
             'vitamin','supplement','dermatology','ophthalmology',
             'surgery','emergency','other'],
      default: 'other',
    },
    dosageForm: {
      type: String,
      enum: ['tablet','capsule','syrup','injection','cream','ointment',
             'drops','inhaler','patch','suppository','powder','gel','oral','other'],
    },
    strength:    { type: String },
    composition: [{ ingredient: String, amount: String }],

    description:       { type: String },
    uses:              [{ type: String }],
    indications:       [{ type: String }],
    contraindications: [{ type: String }],
    warnings:          [{ type: String }],
    precautions:       [{ type: String }],
    sideEffects: [{
      severity:    { type: String, enum: ['mild','moderate','severe'], default: 'mild' },
      description: String,
    }],
    interactions: [{
      medicine:    String,
      description: String,
      severity:    String,
    }],

    dosageInstructions: {
      adults:       String,
      children:     String,
      elderly:      String,
      frequency:    String,
      maxDailyDose: String,
      duration:     String,
      withFood:     Boolean,
      consumption:  String,
    },

    storage: {
      temperature: String,
      conditions:  String,
      light:       String,
    },

    manufacturingDate: { type: Date },
    expiryDate:        { type: Date },
    isExpired:         { type: Boolean, default: false },
    expiryStatus:      { type: String, enum: ['safe','near_expiry','expired'], default: 'safe' },

    price:    { type: Number, min: 0 },
    mrp:      { type: Number, min: 0 },
    currency: { type: String, default: 'INR' },

    qrCode:     { type: String },
    qrCodeData: { type: String },

    prescriptionRequired: { type: Boolean, default: false },
    isActive:             { type: Boolean, default: true },
    isGeneric:            { type: Boolean, default: false },

    addedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    scanCount: { type: Number, default: 0, min: 0 },
    image:     { type: String },
  },
  { timestamps: true }
);

// ── Auto-generate medicine ID (BUG FIX: use findOneAndUpdate counter to avoid race condition) ──
medicineSchema.pre('save', async function (next) {
  if (!this.isNew || this.medicineId) return next();
  try {
    // Use a counter document for atomic sequential ID generation
    const Counter = mongoose.model('Counter');
    const counter = await Counter.findOneAndUpdate(
      { _id: 'medicineId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.medicineId = `MED${String(counter.seq).padStart(5, '0')}`;
    next();
  } catch (err) {
    // Fallback to timestamp-based ID if counter fails
    this.medicineId = `MED${Date.now()}`;
    next();
  }
});

// ── Auto-compute expiry status ──────────────────────────────────────────────
medicineSchema.pre('save', function (next) {
  if (!this.expiryDate) return next();
  const now      = new Date();
  const exp      = new Date(this.expiryDate);
  const diffDays = Math.ceil((exp - now) / 86400000);

  if (diffDays <= 0)   { this.isExpired = true;  this.expiryStatus = 'expired'; }
  else if (diffDays <= 90) { this.isExpired = false; this.expiryStatus = 'near_expiry'; }
  else                 { this.isExpired = false; this.expiryStatus = 'safe'; }
  next();
});

// ── Indexes ────────────────────────────────────────────────────────────────
medicineSchema.index({ name: 'text', genericName: 'text', brand: 'text', manufacturer: 'text' });
medicineSchema.index({ category: 1, isActive: 1 });
medicineSchema.index({ expiryStatus: 1, isActive: 1 });
medicineSchema.index({ barcode: 1 }, { sparse: true });
medicineSchema.index({ batchNumber: 1 }, { sparse: true });
medicineSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Medicine', medicineSchema);
