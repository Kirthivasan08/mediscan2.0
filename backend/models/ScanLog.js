const mongoose = require('mongoose');

// Each scan of a QR or barcode creates a ScanLog entry
// System efficiency = Successful Retrievals / Total Scans × 100
const scanLogSchema = new mongoose.Schema(
  {
    user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    medicine:   { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
    patient:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // for patient QR scans
    rawData:    { type: String },          // raw decoded QR string
    scanType:   { type: String, enum: ['qr','barcode','manual','patient_qr'], default: 'qr' },
    found:      { type: Boolean, default: false },
    resultType: { type: String, enum: ['medicine','patient','invalid'], default: 'invalid' },
    deviceInfo: { type: String },
    notes:      { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ScanLog', scanLogSchema);
