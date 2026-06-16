const Medicine = require('../models/Medicine');

// ── POST /api/interactions/check ─────────────────────────────────────────────
// Body: { medicineIds: [id1, id2, ...] }
exports.checkInteractions = async (req, res) => {
  try {
    const { medicineIds } = req.body;
    if (!medicineIds || medicineIds.length < 2) {
      return res.status(400).json({ success: false, message: 'Provide at least 2 medicine IDs.' });
    }

    const medicines = await Medicine.find({ _id: { $in: medicineIds }, isActive: true });
    if (medicines.length < 2) {
      return res.status(404).json({ success: false, message: 'One or more medicines not found.' });
    }

    const interactions = [];
    const warnings     = [];
    const expiredMeds  = [];

    // Check expiry for all medicines
    medicines.forEach(m => {
      if (m.expiryStatus === 'expired') {
        expiredMeds.push({ id: m._id, name: m.name, expiryDate: m.expiryDate });
      }
    });

    // Cross-check interactions for each pair
    for (let i = 0; i < medicines.length; i++) {
      for (let j = i + 1; j < medicines.length; j++) {
        const medA = medicines[i];
        const medB = medicines[j];

        // Check if medA lists medB as an interaction
        medA.interactions?.forEach(inter => {
          if (
            inter.medicine?.toLowerCase().includes(medB.name.toLowerCase()) ||
            inter.medicine?.toLowerCase().includes(medB.genericName?.toLowerCase())
          ) {
            interactions.push({
              drugA:       medA.name,
              drugB:       medB.name,
              description: inter.description,
              severity:    inter.severity || 'moderate',
            });
          }
        });

        // Check if medB lists medA as an interaction
        medB.interactions?.forEach(inter => {
          if (
            inter.medicine?.toLowerCase().includes(medA.name.toLowerCase()) ||
            inter.medicine?.toLowerCase().includes(medA.genericName?.toLowerCase())
          ) {
            // Avoid duplicates
            const alreadyFound = interactions.some(
              ix => ix.drugA === medB.name && ix.drugB === medA.name
            );
            if (!alreadyFound) {
              interactions.push({
                drugA:       medB.name,
                drugB:       medA.name,
                description: inter.description,
                severity:    inter.severity || 'moderate',
              });
            }
          }
        });

        // Same-category warning (e.g. two analgesics, two antibiotics)
        if (medA.category === medB.category && medA.category !== 'vitamin' && medA.category !== 'supplement') {
          warnings.push({
            type:    'SAME_CATEGORY',
            message: `Both ${medA.name} and ${medB.name} are ${medA.category}s. Consult your doctor before combining.`,
            severity: 'moderate',
          });
        }
      }
    }

    const severityScore = interactions.reduce((acc, inter) => {
      return acc + (inter.severity === 'severe' ? 3 : inter.severity === 'moderate' ? 2 : 1);
    }, 0);

    const riskLevel = severityScore >= 6 ? 'HIGH' : severityScore >= 3 ? 'MODERATE' : severityScore > 0 ? 'LOW' : 'SAFE';

    res.json({
      success: true,
      medicines: medicines.map(m => ({ _id: m._id, name: m.name, brand: m.brand, category: m.category, expiryStatus: m.expiryStatus })),
      interactions,
      warnings,
      expiredMedicines: expiredMeds,
      riskLevel,
      severityScore,
      summary: interactions.length === 0
        ? 'No known interactions found between selected medicines.'
        : `Found ${interactions.length} interaction(s). Risk level: ${riskLevel}.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
