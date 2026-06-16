const Medicine   = require('../models/Medicine');
const User       = require('../models/User');
const Treatment  = require('../models/Treatment');
const AuditLog   = require('../models/AuditLog');
const ScanLog    = require('../models/ScanLog');
const { generateMedicinePDF, generatePatientPDF } = require('../utils/pdfService');

// ── GET /api/reports/medicine/:id/pdf ──────────────────────────────────────
exports.medicinePDF = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id).populate('addedBy','name');
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found.' });

    const pdf = await generateMedicinePDF(medicine);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${medicine.name.replace(/\s+/g,'_')}_info.pdf"`);
    res.send(pdf);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/reports/patient/:id/pdf ───────────────────────────────────────
exports.patientPDF = async (req, res) => {
  try {
    const patient    = await User.findById(req.params.id);
    const treatments = await Treatment.find({ patient: req.params.id })
      .populate('prescriptions.medicine', 'name brand');

    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });

    // Only the patient themselves or privileged roles can access
    if (req.user.role === 'patient' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const pdf = await generatePatientPDF(patient, treatments);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${patient.patientId || patient.name}_records.pdf"`);
    res.send(pdf);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/reports/audit-log ─────────────────────────────────────────────
exports.getAuditLog = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, userId } = req.query;
    const query = {};
    if (action) query.action = action;
    if (userId) query.user   = userId;

    const total = await AuditLog.countDocuments(query);
    const logs  = await AuditLog.find(query)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, logs, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/reports/analytics ─────────────────────────────────────────────
exports.getAnalytics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 24 * 3600 * 1000);

    const [
      scansByDay, topMedicines, scansByType, userGrowth,
    ] = await Promise.all([
      // Scans per day
      ScanLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: 1 }, found: { $sum: { $cond: ['$found', 1, 0] } } } },
        { $sort: { _id: 1 } },
      ]),
      // Top 10 most scanned medicines
      ScanLog.aggregate([
        { $match: { found: true, medicine: { $exists: true } } },
        { $group: { _id: '$medicine', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 10 },
        { $lookup: { from: 'medicines', localField: '_id', foreignField: '_id', as: 'med' } },
        { $unwind: '$med' },
        { $project: { name: '$med.name', brand: '$med.brand', category: '$med.category', count: 1 } },
      ]),
      // Scans by type
      ScanLog.aggregate([
        { $group: { _id: '$scanType', count: { $sum: 1 } } },
      ]),
      // New users per month (last 6 months)
      User.aggregate([
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: -1 } }, { $limit: 6 },
      ]),
    ]);

    res.json({ success: true, analytics: { scansByDay, topMedicines, scansByType, userGrowth } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
