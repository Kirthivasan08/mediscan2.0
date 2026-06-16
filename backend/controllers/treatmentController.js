const Treatment = require('../models/Treatment');
const User      = require('../models/User');
const email     = require('../utils/emailService');
const logger    = require('../config/logger');

// ── GET /api/treatments ────────────────────────────────────────────────────
exports.getTreatments = async (req, res) => {
  try {
    const { patientId, status } = req.query;
    let query = {};

    if (req.user.role === 'patient') {
      query.patient = req.user._id;            // patients only see own records
    } else if (patientId) {
      query.patient = patientId;
    } else if (req.user.role === 'doctor') {
      query.doctor = req.user._id;             // doctors see their own patients
    }
    // admins & pharmacists see all when no patientId given

    if (status) query.status = status;

    const treatments = await Treatment.find(query)
      .populate('patient', 'name patientId avatar bloodGroup allergies email')
      .populate('doctor',  'name specialization hospital')
      .populate('prescriptions.medicine', 'name brand strength category expiryStatus')
      .sort({ updatedAt: -1 });

    res.json({ success: true, treatments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/treatments/:id ────────────────────────────────────────────────
exports.getTreatment = async (req, res) => {
  try {
    const treatment = await Treatment.findById(req.params.id)
      .populate('patient', 'name patientId avatar dateOfBirth gender bloodGroup allergies emergencyContact email')
      .populate('doctor',  'name specialization hospital')
      .populate('prescriptions.medicine', 'name brand strength dosageInstructions category expiryStatus');

    if (!treatment)
      return res.status(404).json({ success: false, message: 'Treatment record not found.' });

    // BUG FIX: patient can only view own treatments
    if (req.user.role === 'patient') {
      const patientId = treatment.patient?._id?.toString() || treatment.patient?.toString();
      if (patientId !== req.user._id.toString())
        return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, treatment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/treatments ───────────────────────────────────────────────────
exports.createTreatment = async (req, res) => {
  try {
    const { prescriptions = [], ...rest } = req.body;

    // Validate patient exists
    const patient = await User.findById(rest.patient).select('name email role');
    if (!patient || patient.role !== 'patient')
      return res.status(400).json({ success: false, message: 'Invalid patient ID.' });

    const treatment = await Treatment.create({
      ...rest,
      prescriptions,
      doctor:     req.user._id,
      doctorName: req.user.name,
      hospital:   req.user.hospital || rest.hospital,
    });

    await treatment.populate('prescriptions.medicine', 'name brand strength');

    // Email patient — fire and forget
    if (patient.email) {
      email.sendPrescriptionNotification(patient, treatment, treatment.prescriptions)
        .catch(err => logger.warn('Prescription email failed', { error: err.message }));
    }

    res.status(201).json({ success: true, treatment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/treatments/:id ────────────────────────────────────────────────
exports.updateTreatment = async (req, res) => {
  try {
    // BUG FIX: prevent doctor from reassigning treatment to different patient
    const { patient: _ignorePatient, doctor: _ignoreDoctor, ...updates } = req.body;

    const treatment = await Treatment.findByIdAndUpdate(
      req.params.id, updates, { new: true, runValidators: true }
    )
      .populate('patient', 'name email')
      .populate('prescriptions.medicine', 'name brand strength');

    if (!treatment)
      return res.status(404).json({ success: false, message: 'Treatment not found.' });

    // Notify patient of changes
    if (treatment.patient?.email) {
      email.sendTreatmentUpdated(treatment.patient, treatment)
        .catch(err => logger.warn('Update email failed', { error: err.message }));
    }

    res.json({ success: true, treatment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/treatments/patient/:userId ────────────────────────────────────
// Used by doctors/pharmacists — full patient treatment history
exports.getPatientHistory = async (req, res) => {
  try {
    const patient = await User.findById(req.params.userId).select('-password');
    if (!patient)
      return res.status(404).json({ success: false, message: 'Patient not found.' });

    // BUG FIX: pharmacist sees read-only (already enforced by authorize on route)
    // but we still want to log this access for audit purposes
    const treatments = await Treatment.find({ patient: req.params.userId })
      .populate('doctor', 'name specialization hospital')
      .populate('prescriptions.medicine', 'name brand strength category expiryStatus qrCode')
      .sort({ startDate: -1 });

    res.json({ success: true, patient, treatments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
