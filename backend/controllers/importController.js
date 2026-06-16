const XLSX    = require('xlsx');
const QRCode  = require('qrcode');
const Medicine = require('../models/Medicine');
const logger   = require('../config/logger');

// ── POST /api/medicines/bulk-import ────────────────────────────────────────
exports.bulkImport = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const rows     = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows.length) return res.status(400).json({ success: false, message: 'File is empty.' });

    const results = { success: 0, failed: 0, errors: [] };

    for (const [idx, row] of rows.entries()) {
      try {
        const medicineData = {
          name:         row['Name'] || row['name'],
          genericName:  row['Generic Name'] || row['genericName'],
          brand:        row['Brand'] || row['brand'],
          manufacturer: row['Manufacturer'] || row['manufacturer'],
          batchNumber:  row['Batch Number'] || row['batchNumber'],
          barcode:      row['Barcode'] || row['barcode'],
          category:     (row['Category'] || row['category'] || 'other').toLowerCase(),
          dosageForm:   (row['Dosage Form'] || row['dosageForm'] || 'tablet').toLowerCase(),
          strength:     row['Strength'] || row['strength'],
          description:  row['Description'] || row['description'],
          price:        parseFloat(row['Price'] || row['price']) || undefined,
          mrp:          parseFloat(row['MRP'] || row['mrp']) || undefined,
          expiryDate:       row['Expiry Date']       || row['expiryDate']       || undefined,
          manufacturingDate: row['Manufacturing Date'] || row['manufacturingDate'] || undefined,
          prescriptionRequired: ['yes','true','1'].includes(String(row['Prescription Required'] || '').toLowerCase()),
          addedBy: req.user._id,
        };

        if (!medicineData.name) {
          results.errors.push({ row: idx + 2, error: 'Name is required' });
          results.failed++;
          continue;
        }

        const medicine = await Medicine.create(medicineData);

        // Generate QR for each
        const qrData = JSON.stringify({
          type: 'medicine', medicineId: medicine.medicineId, id: medicine._id,
          name: medicine.name, expiryDate: medicine.expiryDate,
          url: `${process.env.CLIENT_URL}/medicine/${medicine._id}`,
        });
        medicine.qrCode     = await QRCode.toDataURL(qrData, { errorCorrectionLevel: 'H', width: 256 });
        medicine.qrCodeData = qrData;
        await medicine.save();

        results.success++;
      } catch (err) {
        results.errors.push({ row: idx + 2, error: err.message });
        results.failed++;
      }
    }

    logger.info('Bulk import completed', results);
    res.json({ success: true, results, message: `${results.success} imported, ${results.failed} failed.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/medicines/export ───────────────────────────────────────────────
exports.exportMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find({ isActive: true }).lean();

    const data = medicines.map(m => ({
      'Medicine ID':        m.medicineId,
      'Name':               m.name,
      'Generic Name':       m.genericName || '',
      'Brand':              m.brand || '',
      'Manufacturer':       m.manufacturer || '',
      'Category':           m.category,
      'Dosage Form':        m.dosageForm || '',
      'Strength':           m.strength || '',
      'Batch Number':       m.batchNumber || '',
      'Barcode':            m.barcode || '',
      'Price (INR)':        m.price || '',
      'MRP (INR)':          m.mrp || '',
      'Manufacturing Date': m.manufacturingDate ? new Date(m.manufacturingDate).toLocaleDateString() : '',
      'Expiry Date':        m.expiryDate ? new Date(m.expiryDate).toLocaleDateString() : '',
      'Expiry Status':      m.expiryStatus,
      'Prescription Req.':  m.prescriptionRequired ? 'Yes' : 'No',
      'Scan Count':         m.scanCount,
      'Description':        m.description || '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Medicines');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=medicines_export.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
