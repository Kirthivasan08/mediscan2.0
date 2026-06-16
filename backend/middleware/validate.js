const Joi = require('joi');

const validate = (schema, target = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[target], {
    abortEarly:   false,
    allowUnknown: false,   // BUG FIX: was true — unknown fields passed straight to DB
    stripUnknown: true,    // silently strip extra fields instead of erroring
    convert:      true,    // auto-coerce types (string "true" → boolean)
  });
  if (error) {
    const messages = error.details.map(d => d.message.replace(/"/g, ''));
    return res.status(400).json({ success: false, message: 'Validation failed', errors: messages });
  }
  req[target] = value;   // use the sanitised + coerced value going forward
  next();
};

// ── Register ────────────────────────────────────────────────────────────────
exports.validateRegister = validate(Joi.object({
  name:        Joi.string().min(2).max(60).trim().required(),
  email:       Joi.string().email({ tlds: { allow: false } }).lowercase().trim().required(),
  password:    Joi.string().min(6).max(100).required(),
  role:        Joi.string().valid('patient','doctor','pharmacist','admin').default('patient'),
  gender:      Joi.string().valid('male','female','other').optional(),
  bloodGroup:  Joi.string().max(10).optional().allow(''),
  contact:     Joi.string().max(20).optional().allow(''),
  dateOfBirth: Joi.date().max('now').optional().allow(null),
}));

// ── Login ────────────────────────────────────────────────────────────────────
exports.validateLogin = validate(Joi.object({
  email:    Joi.string().email({ tlds: { allow: false } }).lowercase().trim().required(),
  password: Joi.string().required(),
}));

// ── Medicine ─────────────────────────────────────────────────────────────────
exports.validateMedicine = validate(Joi.object({
  name:         Joi.string().min(1).max(200).trim().required(),
  genericName:  Joi.string().max(200).trim().optional().allow(''),
  brand:        Joi.string().max(300).trim().optional().allow(''),
  manufacturer: Joi.string().max(200).trim().optional().allow(''),
  batchNumber:  Joi.string().max(100).trim().optional().allow(''),
  barcode:      Joi.string().max(100).trim().optional().allow(''),
  category:     Joi.string().valid(
    'antibiotic','analgesic','antiviral','antifungal','cardiovascular',
    'diabetes','neurological','respiratory','gastrointestinal',
    'vitamin','supplement','dermatology','ophthalmology',
    'surgery','emergency','other'
  ).optional().default('other'),
  dosageForm:   Joi.string().valid(
    'tablet','capsule','syrup','injection','cream','ointment',
    'drops','inhaler','patch','suppository','powder','gel','oral','other'
  ).optional(),
  strength:             Joi.string().max(100).optional().allow(''),
  description:          Joi.string().max(2000).optional().allow(''),
  uses:                 Joi.array().items(Joi.string().max(200)).optional(),
  indications:          Joi.array().items(Joi.string().max(200)).optional(),
  contraindications:    Joi.array().items(Joi.string().max(200)).optional(),
  warnings:             Joi.array().items(Joi.string().max(500)).optional(),
  precautions:          Joi.array().items(Joi.string().max(500)).optional(),
  sideEffects:          Joi.array().items(Joi.object({
    severity:    Joi.string().valid('mild','moderate','severe').default('mild'),
    description: Joi.string().max(300).required(),
  })).optional(),
  interactions:         Joi.array().items(Joi.object({
    medicine:    Joi.string().max(200).required(),
    description: Joi.string().max(300).optional().allow(''),
    severity:    Joi.string().optional().allow(''),
  })).optional(),
  composition:          Joi.array().items(Joi.object({
    ingredient: Joi.string().max(200).required(),
    amount:     Joi.string().max(100).optional().allow(''),
  })).optional(),
  dosageInstructions:   Joi.object({
    adults:       Joi.string().max(300).optional().allow(''),
    children:     Joi.string().max(300).optional().allow(''),
    elderly:      Joi.string().max(300).optional().allow(''),
    frequency:    Joi.string().max(200).optional().allow(''),
    maxDailyDose: Joi.string().max(100).optional().allow(''),
    duration:     Joi.string().max(100).optional().allow(''),
    withFood:     Joi.boolean().optional(),
    consumption:  Joi.string().max(100).optional().allow(''),
  }).optional(),
  storage:              Joi.object({
    temperature: Joi.string().max(100).optional().allow(''),
    conditions:  Joi.string().max(200).optional().allow(''),
    light:       Joi.string().max(100).optional().allow(''),
  }).optional(),
  price:                Joi.number().min(0).max(999999).optional().allow(null),
  mrp:                  Joi.number().min(0).max(999999).optional().allow(null),
  currency:             Joi.string().max(10).optional().default('INR'),
  expiryDate:           Joi.date().optional().allow(null),
  manufacturingDate:    Joi.date().optional().allow(null),
  prescriptionRequired: Joi.boolean().optional().default(false),
  isGeneric:            Joi.boolean().optional().default(false),
  image:                Joi.string().uri().max(500).optional().allow(''),
}));

// ── Scan ─────────────────────────────────────────────────────────────────────
exports.validateScan = validate(Joi.object({
  rawData:  Joi.string().min(1).max(5000).required(),
  scanType: Joi.string().valid('qr','barcode','manual','patient_qr').default('qr'),
}));

// ── Treatment ────────────────────────────────────────────────────────────────
exports.validateTreatment = validate(Joi.object({
  patient:  Joi.string().hex().length(24).required(),   // must be valid ObjectId
  disease:  Joi.string().min(1).max(200).trim().required(),
  type:     Joi.string().valid('chronic','surgery','infection','injury','other').default('other'),
  severity: Joi.string().valid('mild','moderate','severe').default('mild'),
  status:   Joi.string().valid('ongoing','recovered','stopped','follow_up').default('ongoing'),
  hospital: Joi.string().max(200).trim().optional().allow(''),
  startDate:Joi.date().optional(),
  endDate:  Joi.date().min(Joi.ref('startDate')).optional().allow(null),  // endDate >= startDate
  notes:    Joi.string().max(2000).optional().allow(''),
  prescriptions: Joi.array().items(Joi.object({
    medicine:     Joi.string().hex().length(24).optional().allow(''),
    medicineName: Joi.string().max(300).trim().required(),
    dosage:       Joi.string().max(200).optional().allow(''),
    frequency:    Joi.string().max(200).optional().allow(''),
    duration:     Joi.string().max(200).optional().allow(''),
    instructions: Joi.string().max(500).optional().allow(''),
    status:       Joi.string().valid('active','completed','stopped').default('active'),
  })).optional().default([]),
}));

module.exports = exports;
