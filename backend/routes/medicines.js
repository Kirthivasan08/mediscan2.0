const express = require('express');
const router  = express.Router();

const {
  getMedicines, getMedicine, createMedicine, updateMedicine, deleteMedicine,
  scanMedicine, saveMedicine, unsaveMedicine, getScanHistory,
  getDashboardStats, regenerateQR,
} = require('../controllers/medicineController');
const { protect, authorize }              = require('../middleware/auth');
const { validateMedicine, validateScan } = require('../middleware/validate');
const audit                               = require('../middleware/audit');

// ── Specific routes FIRST (before :id wildcard) ────────────────────────────
router.get  ('/dashboard',   protect, authorize('admin','pharmacist','doctor'), getDashboardStats);
router.get  ('/scan-history',protect, getScanHistory);
router.post ('/scan',        protect, validateScan, scanMedicine);

// ── Public list + detail ───────────────────────────────────────────────────
router.get('/',    getMedicines);
router.get('/:id', getMedicine);

// ── Save/unsave ────────────────────────────────────────────────────────────
router.post  ('/:id/save',        protect, saveMedicine);
router.delete('/:id/save',        protect, unsaveMedicine);
router.post  ('/:id/regenerate-qr', protect, authorize('admin','pharmacist'), regenerateQR);

// ── Admin / Pharmacist / Doctor CRUD ──────────────────────────────────────
router.post  ('/', protect, authorize('admin','pharmacist','doctor'), validateMedicine, audit('CREATE_MEDICINE','Medicine'), createMedicine);
router.put   ('/:id', protect, authorize('admin','pharmacist'), validateMedicine, audit('UPDATE_MEDICINE','Medicine'), updateMedicine);
router.delete('/:id', protect, authorize('admin'), audit('DELETE_MEDICINE','Medicine'), deleteMedicine);

module.exports = router;
