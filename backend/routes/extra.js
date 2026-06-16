const express = require('express');
const multer  = require('multer');
const router  = express.Router();

const { protect, authorize }    = require('../middleware/auth');
const { checkInteractions }     = require('../controllers/interactionController');
const { medicinePDF, patientPDF, getAuditLog, getAnalytics } = require('../controllers/reportController');
const { bulkImport, exportMedicines } = require('../controllers/importController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ── Drug interactions ─────────────────────────────────────────────────────
router.post('/interactions/check', protect, checkInteractions);

// ── PDF reports ───────────────────────────────────────────────────────────
router.get('/reports/medicine/:id/pdf', protect, medicinePDF);
router.get('/reports/patient/:id/pdf',  protect, patientPDF);
router.get('/reports/analytics',        protect, authorize('admin','pharmacist','doctor'), getAnalytics);
router.get('/reports/audit-log',        protect, authorize('admin'), getAuditLog);

// ── Bulk import / export (mounted separately from /api/medicines to avoid :id conflict) ──
router.post('/import/medicines', protect, authorize('admin','pharmacist'), upload.single('file'), bulkImport);
router.get ('/export/medicines', protect, authorize('admin','pharmacist'), exportMedicines);

module.exports = router;
