const PDFDocument = require('pdfkit');

// ── Common styles ───────────────────────────────────────────────────────────
const COLORS = {
  primary:   '#0077cc',
  dark:      '#1a2332',
  muted:     '#718096',
  light:     '#e6f2ff',
  border:    '#d0e4f7',
  danger:    '#e53e3e',
  warning:   '#d69e2e',
  success:   '#00b894',
  white:     '#ffffff',
};

function header(doc, title, subtitle) {
  doc.rect(0, 0, doc.page.width, 80).fill(COLORS.primary);
  doc.fillColor(COLORS.white).fontSize(22).font('Helvetica-Bold').text('MediScan', 40, 22);
  doc.fillColor('rgba(255,255,255,0.8)').fontSize(10).font('Helvetica').text('QR-Based Intelligent Medicine Information System', 40, 48);
  doc.fillColor(COLORS.dark).fontSize(18).font('Helvetica-Bold').text(title, 40, 100);
  if (subtitle) doc.fillColor(COLORS.muted).fontSize(11).font('Helvetica').text(subtitle, 40, 122);
  doc.moveDown(2);
}

function section(doc, heading) {
  doc.moveDown(0.6);
  doc.fillColor(COLORS.primary).fontSize(13).font('Helvetica-Bold').text(heading);
  doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor(COLORS.border).lineWidth(1).stroke();
  doc.moveDown(0.4);
}

function row(doc, label, value, dangerous = false) {
  if (!value) return;
  doc.fillColor(COLORS.muted).fontSize(10).font('Helvetica').text(label + ':', 40, doc.y, { continued: true, width: 140 });
  doc.fillColor(dangerous ? COLORS.danger : COLORS.dark).font('Helvetica').text(String(value), { width: 350 });
}

// ── Medicine PDF ─────────────────────────────────────────────────────────────
exports.generateMedicinePDF = (medicine) => {
  return new Promise((resolve, reject) => {
    try {
      const chunks = [];
      const doc    = new PDFDocument({ margin: 40, size: 'A4' });

      doc.on('data',  c => chunks.push(c));
      doc.on('end',   () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      header(doc, medicine.name, `${medicine.genericName || ''} · ${medicine.category}`);

      section(doc, 'Identification');
      row(doc, 'Medicine ID',  medicine.medicineId);
      row(doc, 'Brand',        medicine.brand);
      row(doc, 'Manufacturer', medicine.manufacturer);
      row(doc, 'Batch Number', medicine.batchNumber);
      row(doc, 'Strength',     medicine.strength);
      row(doc, 'Dosage Form',  medicine.dosageForm);
      row(doc, 'Category',     medicine.category);

      section(doc, 'Dates & Pricing');
      row(doc, 'Manufacturing Date', medicine.manufacturingDate ? new Date(medicine.manufacturingDate).toLocaleDateString() : null);
      row(doc, 'Expiry Date',        medicine.expiryDate ? new Date(medicine.expiryDate).toLocaleDateString() : null, medicine.isExpired);
      row(doc, 'Status',             medicine.expiryStatus?.toUpperCase(), medicine.expiryStatus === 'expired');
      row(doc, 'Price',              medicine.price ? `${medicine.currency || 'INR'} ${medicine.price}` : null);
      row(doc, 'MRP',                medicine.mrp   ? `${medicine.currency || 'INR'} ${medicine.mrp}`   : null);
      row(doc, 'Prescription Req.',  medicine.prescriptionRequired ? 'Yes' : 'No');

      if (medicine.description) {
        section(doc, 'Description');
        doc.fillColor(COLORS.dark).fontSize(11).font('Helvetica').text(medicine.description, { width: doc.page.width - 80 });
      }

      if (medicine.uses?.length) {
        section(doc, 'Uses & Indications');
        medicine.uses.forEach(u => {
          doc.fillColor(COLORS.dark).fontSize(11).font('Helvetica').text(`• ${u}`, { indent: 10 });
        });
      }

      if (medicine.dosageInstructions?.adults) {
        section(doc, 'Dosage Instructions');
        row(doc, 'Adults',      medicine.dosageInstructions.adults);
        row(doc, 'Children',    medicine.dosageInstructions.children);
        row(doc, 'Frequency',   medicine.dosageInstructions.frequency);
        row(doc, 'Max Daily',   medicine.dosageInstructions.maxDailyDose);
        row(doc, 'Duration',    medicine.dosageInstructions.duration);
        row(doc, 'Consumption', medicine.dosageInstructions.consumption);
      }

      if (medicine.warnings?.length) {
        section(doc, '⚠ Warnings');
        medicine.warnings.forEach(w => {
          doc.fillColor(COLORS.warning).fontSize(11).font('Helvetica').text(`⚠ ${w}`, { indent: 10 });
        });
      }

      if (medicine.contraindications?.length) {
        section(doc, 'Contraindications');
        medicine.contraindications.forEach(c => {
          doc.fillColor(COLORS.danger).fontSize(11).font('Helvetica').text(`✗ ${c}`, { indent: 10 });
        });
      }

      if (medicine.sideEffects?.length) {
        section(doc, 'Side Effects');
        medicine.sideEffects.forEach(se => {
          const color = se.severity === 'severe' ? COLORS.danger : se.severity === 'moderate' ? COLORS.warning : COLORS.success;
          doc.fillColor(color).fontSize(10).font('Helvetica-Bold').text(`[${se.severity.toUpperCase()}] `, { continued: true });
          doc.fillColor(COLORS.dark).font('Helvetica').fontSize(11).text(se.description);
        });
      }

      if (medicine.storage?.conditions) {
        section(doc, 'Storage Instructions');
        row(doc, 'Temperature', medicine.storage.temperature);
        row(doc, 'Conditions',  medicine.storage.conditions);
        row(doc, 'Light',       medicine.storage.light);
      }

      if (medicine.qrCode) {
        // Embed QR as base64 image
        try {
          const base64Data = medicine.qrCode.replace(/^data:image\/\w+;base64,/, '');
          const imgBuffer  = Buffer.from(base64Data, 'base64');
          doc.addPage();
          header(doc, 'QR Code', `${medicine.name} · ${medicine.medicineId}`);
          doc.image(imgBuffer, (doc.page.width - 200) / 2, doc.y, { width: 200 });
          doc.moveDown(1);
          doc.fillColor(COLORS.muted).fontSize(10).font('Helvetica')
             .text('Scan this QR code to access complete medicine information', { align: 'center' });
        } catch { /* skip if QR embed fails */ }
      }

      // Footer on every page
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fillColor(COLORS.muted).fontSize(8).font('Helvetica')
           .text(`Generated by MediScan · ${new Date().toLocaleDateString()} · Page ${i + 1} of ${range.count}`,
                 40, doc.page.height - 40, { align: 'center' });
      }

      doc.end();
    } catch (err) { reject(err); }
  });
};

// ── Patient history PDF ──────────────────────────────────────────────────────
exports.generatePatientPDF = (patient, treatments) => {
  return new Promise((resolve, reject) => {
    try {
      const chunks = [];
      const doc    = new PDFDocument({ margin: 40, size: 'A4' });

      doc.on('data',  c => chunks.push(c));
      doc.on('end',   () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      header(doc, `Patient Record: ${patient.name}`, `ID: ${patient.patientId || 'N/A'}`);

      section(doc, 'Personal Information');
      row(doc, 'Patient ID',    patient.patientId);
      row(doc, 'Name',          patient.name);
      row(doc, 'Date of Birth', patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : null);
      row(doc, 'Gender',        patient.gender);
      row(doc, 'Blood Group',   patient.bloodGroup);
      row(doc, 'Contact',       patient.contact);
      row(doc, 'Allergies',     patient.allergies?.join(', ') || 'None', patient.allergies?.length > 0);

      if (patient.emergencyContact?.name) {
        section(doc, 'Emergency Contact');
        row(doc, 'Name',     patient.emergencyContact.name);
        row(doc, 'Phone',    patient.emergencyContact.phone);
        row(doc, 'Relation', patient.emergencyContact.relation);
      }

      section(doc, `Treatment History (${treatments.length} records)`);
      treatments.forEach((tx, i) => {
        doc.moveDown(0.3);
        doc.fillColor(COLORS.primary).fontSize(12).font('Helvetica-Bold').text(`${i + 1}. ${tx.disease}`);
        doc.fillColor(COLORS.muted).fontSize(10).font('Helvetica').text(`${tx.status} · ${tx.type} · ${tx.hospital || '—'}`);
        doc.fillColor(COLORS.dark).text(`Dr. ${tx.doctorName || '—'}  |  Start: ${new Date(tx.startDate).toLocaleDateString()}`);
        if (tx.notes) doc.fillColor(COLORS.dark).fontSize(10).text(tx.notes);
        if (tx.prescriptions?.length) {
          doc.fillColor(COLORS.muted).fontSize(10).text('Prescriptions:');
          tx.prescriptions.forEach(p => {
            doc.fillColor(COLORS.dark).text(`  • ${p.medicineName} — ${p.dosage || ''} ${p.frequency || ''}`, { indent: 10 });
          });
        }
        doc.moveTo(40, doc.y + 4).lineTo(doc.page.width - 40, doc.y + 4).strokeColor(COLORS.border).lineWidth(0.5).stroke();
        doc.moveDown(0.4);
      });

      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fillColor(COLORS.muted).fontSize(8).font('Helvetica')
           .text(`Generated by MediScan · ${new Date().toLocaleDateString()} · Page ${i + 1} of ${range.count} · CONFIDENTIAL`,
                 40, doc.page.height - 40, { align: 'center' });
      }

      doc.end();
    } catch (err) { reject(err); }
  });
};
