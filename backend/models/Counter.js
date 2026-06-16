const mongoose = require('mongoose');

// Simple atomic counter used by Medicine and User models
// to avoid race conditions when generating sequential IDs
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },   // e.g. 'medicineId', 'patientId'
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model('Counter', counterSchema);
