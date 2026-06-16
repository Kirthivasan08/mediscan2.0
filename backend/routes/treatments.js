const express = require('express');
const router  = express.Router();

const {
  getTreatments, getTreatment, createTreatment, updateTreatment, getPatientHistory,
} = require('../controllers/treatmentController');
const { protect, authorize }        = require('../middleware/auth');
const { validateTreatment }         = require('../middleware/validate');
const audit                          = require('../middleware/audit');

router.get ('/',                   protect, getTreatments);
router.get ('/patient/:userId',    protect, authorize('admin','doctor','pharmacist'), getPatientHistory);
router.get ('/:id',                protect, getTreatment);
router.post('/',                   protect, authorize('admin','doctor'), validateTreatment, audit('CREATE_TREATMENT','Treatment'), createTreatment);
router.put ('/:id',                protect, authorize('admin','doctor'), audit('UPDATE_TREATMENT','Treatment'), updateTreatment);

module.exports = router;
