require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const QRCode   = require('qrcode');

const connectDB  = require('../config/db');
const Counter    = require('../models/Counter');
const User       = require('../models/User');
const Medicine   = require('../models/Medicine');
const Treatment  = require('../models/Treatment');

const generateQR = async (data) =>
  QRCode.toDataURL(JSON.stringify(data), { errorCorrectionLevel: 'H', width: 256 });

const seed = async () => {
  await connectDB();
  console.log('🌱 Seeding database...');

  await User.deleteMany();
  await Medicine.deleteMany();
  await Treatment.deleteMany();
  // Reset counters so IDs start from 1 after fresh seed
  await Counter.deleteMany();

  // ── Users ───────────────────────────────────────────────────────────────
  const demoPassword = 'Test@1234';

  const admin = await User.create({
    name: 'Dr. Admin', email: 'admin@mediscan.com', password: demoPassword,
    role: 'admin', provider: 'local', isVerified: true,
    specialization: 'Administration', hospital: 'Karpaga Vinayaga Hospital',
  });

  const doctor = await User.create({
    name: 'Dr. Parkavi M.E.', email: 'doctor@mediscan.com', password: demoPassword,
    role: 'doctor', provider: 'local', isVerified: true,
    specialization: 'General Medicine', hospital: 'KVCET Hospital',
    licenseNumber: 'TN-DOC-2024-001', yearsOfExperience: 10,
  });

  const pharmacist = await User.create({
    name: 'Ravi Pharmacist', email: 'pharmacist@mediscan.com', password: demoPassword,
    role: 'pharmacist', provider: 'local', isVerified: true,
    hospital: 'Apollo Pharmacy, Chengalpet',
  });

  const patient = await User.create({
    name: 'Bharathraj T', email: 'patient@mediscan.com', password: demoPassword,
    role: 'patient', provider: 'local', isVerified: true,
    dateOfBirth: new Date('1998-05-07'), gender: 'male',
    bloodGroup: 'O+', contact: '9876543210',
    allergies: ['Penicillin'],
    medicalHistory: [
      { condition: 'Diabetes', diagnosedOn: new Date('2020-01-01'), hospital: 'City Hospital', notes: 'Type 2' },
    ],
    emergencyContact: { name: 'Relative', phone: '9876500000', relation: 'Father' },
  });

  console.log('✅ Users created');

  // ── Medicines ────────────────────────────────────────────────────────────
  const medicinesData = [
    {
      name: 'Paracetamol', genericName: 'Acetaminophen',
      brand: 'Crocin, Dolo-650, Calpol',
      manufacturer: 'GSK Pharmaceuticals', batchNumber: 'PCM-2024-001',
      category: 'analgesic', dosageForm: 'tablet', strength: '500mg',
      composition: [{ ingredient: 'Paracetamol', amount: '500mg' }],
      description: 'Paracetamol is a commonly used analgesic and antipyretic drug used to relieve fever, headaches, and other minor aches.',
      uses: ['Fever', 'Headache', 'Body pain', 'Toothache', 'Joint pain'],
      indications: ['Mild to moderate pain', 'Pyrexia'],
      contraindications: ['Severe hepatic impairment', 'Hypersensitivity to paracetamol'],
      warnings: ['Do not exceed 4g per day', 'Caution in liver disease'],
      precautions: ['Avoid alcohol', 'Consult doctor if fever persists more than 3 days'],
      sideEffects: [
        { severity: 'mild', description: 'Nausea' },
        { severity: 'severe', description: 'Hepatotoxicity with overdose' },
      ],
      dosageInstructions: {
        adults: '1-2 tablets', children: '½ tablet', elderly: '1 tablet',
        frequency: '1 tablet every 6-8 hours if needed',
        maxDailyDose: '4000mg/day (8 tablets)',
        duration: 'Not more than 5 days without medical advice',
        consumption: 'Oral', withFood: false,
      },
      storage: { temperature: 'Below 30°C', conditions: 'Cool, dry place', light: 'Keep away from sunlight' },
      manufacturingDate: new Date('2024-01-01'),
      expiryDate: new Date('2025-12-31'),
      price: 15, mrp: 20, currency: 'INR',
      prescriptionRequired: false, isGeneric: true,
      addedBy: pharmacist._id,
    },
    {
      name: 'Amoxicillin', genericName: 'Amoxicillin Trihydrate',
      brand: 'Mox, Novamox, Amoxil',
      manufacturer: 'Cipla Ltd.', batchNumber: 'AMX-2024-002',
      category: 'antibiotic', dosageForm: 'capsule', strength: '500mg',
      composition: [{ ingredient: 'Amoxicillin', amount: '500mg' }],
      description: 'Amoxicillin is a broad-spectrum antibiotic used to treat various bacterial infections.',
      uses: ['Respiratory infections', 'Ear infections', 'Urinary tract infections', 'Skin infections'],
      contraindications: ['Penicillin allergy'],
      warnings: ['Complete the full course', 'Do not use for viral infections'],
      sideEffects: [
        { severity: 'mild', description: 'Diarrhoea, nausea' },
        { severity: 'severe', description: 'Anaphylaxis in penicillin-allergic patients' },
      ],
      dosageInstructions: {
        adults: '500mg every 8 hours', frequency: 'Three times daily',
        maxDailyDose: '3000mg/day', duration: '5–10 days', consumption: 'Oral', withFood: true,
      },
      storage: { temperature: 'Below 25°C', conditions: 'Dry place' },
      manufacturingDate: new Date('2024-03-01'),
      expiryDate: new Date('2026-02-28'),
      price: 45, mrp: 60, currency: 'INR',
      prescriptionRequired: true, addedBy: doctor._id,
    },
    {
      name: 'Metformin', genericName: 'Metformin Hydrochloride',
      brand: 'Glycomet, Glucophage',
      manufacturer: 'USV Ltd.', batchNumber: 'MET-2024-003',
      category: 'diabetes', dosageForm: 'tablet', strength: '500mg',
      description: 'Metformin is a biguanide antidiabetic drug used for Type 2 diabetes management.',
      uses: ['Type 2 Diabetes Mellitus', 'Insulin resistance', 'PCOS'],
      contraindications: ['Renal failure (eGFR < 30)', 'Metabolic acidosis'],
      warnings: ['Risk of lactic acidosis', 'Monitor renal function'],
      sideEffects: [
        { severity: 'mild', description: 'Nausea, diarrhoea, metallic taste' },
        { severity: 'severe', description: 'Lactic acidosis (rare)' },
      ],
      dosageInstructions: {
        adults: '500mg with meals', frequency: 'Twice or thrice daily',
        maxDailyDose: '2000mg/day', consumption: 'Oral', withFood: true,
      },
      storage: { temperature: 'Below 30°C', conditions: 'Cool dry place' },
      manufacturingDate: new Date('2024-02-01'),
      expiryDate: new Date('2026-01-31'),
      price: 30, mrp: 40, currency: 'INR',
      prescriptionRequired: true, addedBy: doctor._id,
    },
    {
      name: 'Atorvastatin', genericName: 'Atorvastatin Calcium',
      brand: 'Lipitor, Atorva',
      manufacturer: 'Pfizer', batchNumber: 'ATV-2024-004',
      category: 'cardiovascular', dosageForm: 'tablet', strength: '10mg',
      description: 'Atorvastatin is a statin drug used to lower bad cholesterol and triglycerides.',
      uses: ['Hypercholesterolaemia', 'Cardiovascular disease prevention'],
      contraindications: ['Active liver disease', 'Pregnancy'],
      warnings: ['Monitor liver function', 'Report unexplained muscle pain'],
      sideEffects: [
        { severity: 'mild', description: 'Muscle ache, headache, nausea' },
        { severity: 'severe', description: 'Rhabdomyolysis (rare)' },
      ],
      dosageInstructions: {
        adults: '10–80mg once daily', frequency: 'Once daily (evening)',
        consumption: 'Oral', withFood: false,
      },
      storage: { temperature: 'Below 30°C', conditions: 'Store in original container' },
      manufacturingDate: new Date('2024-01-15'),
      expiryDate: new Date('2025-08-31'), // near expiry example
      price: 55, mrp: 70, currency: 'INR',
      prescriptionRequired: true, addedBy: doctor._id,
    },
    {
      name: 'Cetirizine', genericName: 'Cetirizine Hydrochloride',
      brand: 'Zyrtec, Alerid, Cetriz',
      manufacturer: 'Sun Pharma', batchNumber: 'CTZ-2024-005',
      category: 'respiratory', dosageForm: 'tablet', strength: '10mg',
      description: 'Cetirizine is a second-generation antihistamine used to treat allergies.',
      uses: ['Allergic rhinitis', 'Urticaria', 'Hay fever', 'Itching'],
      contraindications: ['Severe renal impairment'],
      warnings: ['May cause drowsiness', 'Avoid alcohol'],
      sideEffects: [
        { severity: 'mild', description: 'Drowsiness, dry mouth, headache' },
      ],
      dosageInstructions: {
        adults: '10mg once daily', children: '5mg once daily (6–12 years)',
        frequency: 'Once daily (bedtime)', consumption: 'Oral', withFood: false,
      },
      storage: { temperature: 'Below 30°C', conditions: 'Dry place' },
      manufacturingDate: new Date('2023-06-01'),
      expiryDate: new Date('2024-09-30'), // expired example
      price: 25, mrp: 35, currency: 'INR',
      prescriptionRequired: false, addedBy: pharmacist._id,
    },
    {
      name: 'Omeprazole', genericName: 'Omeprazole',
      brand: 'Omez, Prilosec',
      manufacturer: 'Dr. Reddy\'s', batchNumber: 'OMP-2024-006',
      category: 'gastrointestinal', dosageForm: 'capsule', strength: '20mg',
      description: 'Omeprazole is a proton pump inhibitor used to reduce stomach acid production.',
      uses: ['Gastric ulcer', 'GERD', 'Acid reflux', 'H. pylori eradication'],
      contraindications: ['Hypersensitivity to benzimidazoles'],
      warnings: ['Long-term use may reduce magnesium levels', 'Risk of C. diff infection'],
      sideEffects: [
        { severity: 'mild', description: 'Headache, diarrhoea, nausea' },
        { severity: 'moderate', description: 'Hypomagnesaemia with long-term use' },
      ],
      dosageInstructions: {
        adults: '20mg once daily', frequency: 'Once daily (30 min before meals)',
        duration: '4–8 weeks', consumption: 'Oral', withFood: false,
      },
      storage: { temperature: 'Below 25°C', conditions: 'Dry place, protect from moisture' },
      manufacturingDate: new Date('2024-04-01'),
      expiryDate: new Date('2026-03-31'),
      price: 35, mrp: 50, currency: 'INR',
      prescriptionRequired: false, addedBy: pharmacist._id,
    },
  ];

  const createdMedicines = [];
  for (const medData of medicinesData) {
    const med = await Medicine.create(medData);
    const qrPayload = {
      type: 'medicine', medicineId: med.medicineId, id: med._id,
      name: med.name, genericName: med.genericName, brand: med.brand,
      batchNumber: med.batchNumber, strength: med.strength,
      expiryDate: med.expiryDate, manufacturer: med.manufacturer,
      url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/medicine/${med._id}`,
    };
    med.qrCode     = await generateQR(qrPayload);
    med.qrCodeData = JSON.stringify(qrPayload);
    await med.save();
    createdMedicines.push(med);
    console.log(`  💊 ${med.name} (${med.medicineId}) seeded`);
  }

  // ── Patient QR ──────────────────────────────────────────────────────────
  const patientQrData = {
    type: 'patient', patientId: patient.patientId, userId: patient._id,
    name: patient.name, url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/patient/${patient._id}`,
  };
  patient.qrCode     = await generateQR(patientQrData);
  patient.qrCodeData = JSON.stringify(patientQrData);
  await patient.save();
  console.log('✅ Patient QR generated for Bharathraj T');

  // ── Sample Treatment Records ─────────────────────────────────────────────
  await Treatment.create({
    patient: patient._id, doctor: doctor._id, doctorName: doctor.name,
    hospital: 'City Hospital', disease: 'Diabetes', type: 'chronic',
    severity: 'moderate', status: 'ongoing',
    startDate: new Date('2020-01-15'), notes: 'Type 2 Diabetes under control with Metformin',
    prescriptions: [{
      medicine: createdMedicines[2]._id, medicineName: 'Metformin 500mg',
      dosage: '500mg', frequency: 'Twice daily with meals', status: 'active',
    }],
    visits: [{ date: new Date('2024-01-10'), notes: 'Routine check-up. HbA1c stable.' }],
  });

  await Treatment.create({
    patient: patient._id, doctor: doctor._id, doctorName: doctor.name,
    hospital: 'KVCET Hospital', disease: 'Hypertension', type: 'chronic',
    severity: 'mild', status: 'ongoing',
    startDate: new Date('2022-02-10'), notes: 'Blood pressure well managed',
    prescriptions: [{
      medicine: createdMedicines[3]._id, medicineName: 'Atorvastatin 10mg',
      dosage: '10mg', frequency: 'Once daily evening', status: 'active',
    }],
  });

  console.log('✅ Treatment records seeded');
  console.log('\n🎉 Seeding complete!\n');
  console.log('── Test Credentials ──────────────────');
  console.log('  Admin      : admin@mediscan.com      / Test@1234');
  console.log('  Doctor     : doctor@mediscan.com     / Test@1234');
  console.log('  Pharmacist : pharmacist@mediscan.com / Test@1234');
  console.log('  Patient    : patient@mediscan.com    / Test@1234');
  console.log('─────────────────────────────────────\n');

  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
