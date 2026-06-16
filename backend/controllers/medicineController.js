const QRCode   = require('qrcode');
const Medicine = require('../models/Medicine');
const ScanLog  = require('../models/ScanLog');
const User     = require('../models/User');
const Treatment = require('../models/Treatment');

// ── Helper: generate QR ────────────────────────────────────────────────────
const generateMedicineQR = async (medicine) => {
  const qrData = JSON.stringify({
    type:         'medicine',
    medicineId:   medicine.medicineId,
    id:           medicine._id,
    name:         medicine.name,
    genericName:  medicine.genericName,
    brand:        medicine.brand,
    batchNumber:  medicine.batchNumber,
    strength:     medicine.strength,
    expiryDate:   medicine.expiryDate,
    manufacturer: medicine.manufacturer,
    url:          `${process.env.CLIENT_URL}/medicine/${medicine._id}`,
  });
  const qrCode = await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'H', type: 'image/png',
    quality: 0.92, margin: 1, color: { dark: '#0f172a', light: '#ffffff' }, width: 300,
  });
  return { qrCode, qrData };
};

// ── GET /api/medicines ─────────────────────────────────────────────────────
exports.getMedicines = async (req, res) => {
  try {
    const {
      page = 1, limit = 12, category, search, expiryStatus, prescriptionRequired,
    } = req.query;

    // BUG FIX: parseInt both page & limit so skip/limit math is correct
    const pageNum  = Math.max(1, parseInt(page)  || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 12));

    const query = { isActive: true };
    if (category && category !== 'all') query.category = category;
    if (expiryStatus)                   query.expiryStatus = expiryStatus;
    if (prescriptionRequired !== undefined)
      query.prescriptionRequired = prescriptionRequired === 'true';
    if (search) query.$text = { $search: search };

    const [total, medicines] = await Promise.all([
      Medicine.countDocuments(query),
      Medicine.find(query)
        .populate('addedBy', 'name role')
        .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
    ]);

    res.json({
      success: true,
      medicines,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/medicines/:id ─────────────────────────────────────────────────
exports.getMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id).populate('addedBy', 'name role');
    if (!medicine || !medicine.isActive)
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    res.json({ success: true, medicine });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/medicines ────────────────────────────────────────────────────
exports.createMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.create({ ...req.body, addedBy: req.user._id });
    const { qrCode, qrData } = await generateMedicineQR(medicine);
    medicine.qrCode     = qrCode;
    medicine.qrCodeData = qrData;
    await medicine.save();
    res.status(201).json({ success: true, medicine });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/medicines/:id ─────────────────────────────────────────────────
exports.updateMedicine = async (req, res) => {
  try {
    // Prevent overwriting QR codes on update
    const { qrCode, qrCodeData, medicineId, ...updates } = req.body;
    const medicine = await Medicine.findByIdAndUpdate(
      req.params.id, updates, { new: true, runValidators: true }
    );
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found.' });
    res.json({ success: true, medicine });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/medicines/:id (soft delete) ────────────────────────────────
exports.deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found.' });
    medicine.isActive = false;
    await medicine.save();
    res.json({ success: true, message: 'Medicine removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/medicines/scan ───────────────────────────────────────────────
exports.scanMedicine = async (req, res) => {
  const startTime = Date.now();
  try {
    const { rawData, scanType = 'qr' } = req.body;
    if (!rawData) return res.status(400).json({ success: false, message: 'Scan data is required.' });

    let medicine   = null;
    let patient    = null;
    let found      = false;
    let resultType = 'invalid';
    let treatments = [];

    // 1. Try JSON QR parse
    try {
      const parsed = JSON.parse(rawData);
      if (parsed.type === 'medicine' && parsed.id) {
        medicine = await Medicine.findById(parsed.id);
      } else if (parsed.type === 'patient' && parsed.userId) {
        patient    = await User.findById(parsed.userId).select('-password');
        resultType = 'patient';
        found      = !!patient;
      } else if (parsed.id) {
        medicine = await Medicine.findById(parsed.id);
      }
    } catch {
      // 2. Raw string → barcode / batch / medicineId / patientId
      medicine = await Medicine.findOne({
        $or: [{ barcode: rawData }, { batchNumber: rawData }, { medicineId: rawData }],
      });

      if (!medicine) {
        // Try patient lookup by patientId string
        const possiblePatient = await User.findOne({ patientId: rawData, role: 'patient' }).select('-password');
        if (possiblePatient) {
          patient    = possiblePatient;
          resultType = 'patient';
          found      = true;
        }
      }
    }

    if (medicine) {
      // BUG FIX: use $inc instead of in-memory scanCount++ to avoid race condition
      await Medicine.findByIdAndUpdate(medicine._id, { $inc: { scanCount: 1 } });
      medicine.scanCount += 1;
      found      = true;
      resultType = 'medicine';

      // Only auto-save if not already saved (prevents duplicate-adding)
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { savedMedicines: medicine._id } });
    }

    // If patient QR scanned by pharmacist/doctor → also fetch their treatments
    if (patient && ['pharmacist', 'doctor', 'admin'].includes(req.user.role)) {
      treatments = await Treatment.find({ patient: patient._id, status: 'ongoing' })
        .populate('doctor', 'name specialization')
        .populate('prescriptions.medicine', 'name brand strength category expiryStatus')
        .sort({ startDate: -1 });
    }

    await ScanLog.create({
      user: req.user._id, medicine: medicine?._id, patient: patient?._id,
      rawData, scanType, found, resultType,
    });

    const Ttotal = Date.now() - startTime;
    res.json({
      success: true, found, resultType, medicine, patient,
      treatments,   // pharmacist sees ongoing treatments on patient scan
      metrics: { totalTimeMs: Ttotal },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/medicines/:id/regenerate-qr ──────────────────────────────────
exports.regenerateQR = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found.' });
    const { qrCode, qrData } = await generateMedicineQR(medicine);
    medicine.qrCode     = qrCode;
    medicine.qrCodeData = qrData;
    await medicine.save();
    res.json({ success: true, qrCode: medicine.qrCode, message: 'QR Code regenerated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/medicines/:id/save ───────────────────────────────────────────
exports.saveMedicine = async (req, res) => {
  try {
    // BUG FIX: validate medicine exists before saving
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine || !medicine.isActive)
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { savedMedicines: req.params.id } });
    res.json({ success: true, message: 'Medicine saved.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/medicines/:id/save ─────────────────────────────────────────
exports.unsaveMedicine = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { savedMedicines: req.params.id } });
    res.json({ success: true, message: 'Medicine removed from saved.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/medicines/scan-history ────────────────────────────────────────
exports.getScanHistory = async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const limitNum = Math.min(200, parseInt(limit) || 50);
    const pageNum  = Math.max(1, parseInt(page) || 1);

    const history = await ScanLog.find({ user: req.user._id })
      .populate('medicine', 'name brand category qrCode expiryStatus')
      .populate('patient',  'name patientId avatar')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/medicines/dashboard ──────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalMedicines, expiredMedicines, nearExpiryMedicines,
      totalScans, successfulScans, totalUsers, totalPatients,
      recentScans, categoryStats,
    ] = await Promise.all([
      Medicine.countDocuments({ isActive: true }),
      Medicine.countDocuments({ isActive: true, expiryStatus: 'expired' }),
      Medicine.countDocuments({ isActive: true, expiryStatus: 'near_expiry' }),
      ScanLog.countDocuments(),
      ScanLog.countDocuments({ found: true }),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'patient', isActive: true }),
      ScanLog.find()
        .populate('user', 'name avatar role')
        .populate('medicine', 'name brand')
        .populate('patient', 'name patientId')
        .sort({ createdAt: -1 })
        .limit(10),
      Medicine.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const accuracy = totalScans > 0
      ? ((successfulScans / totalScans) * 100).toFixed(1)
      : '100.0';

    res.json({
      success: true,
      stats: { totalMedicines, expiredMedicines, nearExpiryMedicines, totalScans, successfulScans, totalUsers, totalPatients },
      accuracy,
      recentScans,
      categoryStats,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
