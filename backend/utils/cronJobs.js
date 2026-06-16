const cron     = require('node-cron');
const Medicine = require('../models/Medicine');
const User     = require('../models/User');
const email    = require('./emailService');
const logger   = require('../config/logger');

const startCrons = () => {

  // ── 1. Refresh expiry status every night at 00:01 IST ─────────────────────
  // BUG FIX: The pre-save hook only runs on .save(). Medicines that were added
  // as "safe" eventually cross into near_expiry/expired without any update
  // trigger. This cron keeps statuses accurate across all medicines daily.
  cron.schedule('1 0 * * *', async () => {
    logger.info('[Cron] Refreshing expiry status for all medicines...');
    try {
      const medicines = await Medicine.find({ isActive: true, expiryDate: { $exists: true } });
      const now = new Date();
      let updated = 0;

      const bulk = Medicine.collection.initializeUnorderedBulkOp();

      for (const m of medicines) {
        const diffDays = Math.ceil((new Date(m.expiryDate) - now) / 86400000);
        const newStatus = diffDays <= 0 ? 'expired' : diffDays <= 90 ? 'near_expiry' : 'safe';
        const isExpired = diffDays <= 0;

        if (m.expiryStatus !== newStatus || m.isExpired !== isExpired) {
          bulk.find({ _id: m._id }).updateOne({ $set: { expiryStatus: newStatus, isExpired } });
          updated++;
        }
      }

      if (updated > 0) await bulk.execute();
      logger.info(`[Cron] Expiry refresh done — ${updated}/${medicines.length} medicines updated`);
    } catch (err) {
      logger.error('[Cron] Expiry refresh failed', { error: err.message });
    }
  }, { timezone: 'Asia/Kolkata' });

  // ── 2. Send expiry alert emails every day at 8:00 AM IST ───────────────────
  cron.schedule('0 8 * * *', async () => {
    logger.info('[Cron] Running expiry alert emails...');
    try {
      const criticalMeds = await Medicine.find({
        isActive: true,
        expiryStatus: { $in: ['expired', 'near_expiry'] },
      }).select('_id name brand expiryDate expiryStatus').lean();

      if (!criticalMeds.length) {
        logger.info('[Cron] No critical medicines today');
        return;
      }

      const criticalIds = criticalMeds.map(m => m._id);

      // Find all active users who have saved any of these medicines
      const users = await User.find({
        isActive:       true,
        savedMedicines: { $in: criticalIds },
      }).select('name email savedMedicines').lean();

      let sent = 0;
      for (const user of users) {
        if (!user.email) continue;

        const savedSet = new Set(user.savedMedicines.map(id => id.toString()));
        const alertMeds = criticalMeds.filter(m => savedSet.has(m._id.toString()));

        if (alertMeds.length > 0) {
          await email.sendExpiryAlert(user, alertMeds);
          sent++;
        }
      }
      logger.info(`[Cron] Expiry alerts sent to ${sent} users`);
    } catch (err) {
      logger.error('[Cron] Expiry alert emails failed', { error: err.message });
    }
  }, { timezone: 'Asia/Kolkata' });

  logger.info('[Cron] Scheduled: expiry refresh 00:01 IST | expiry emails 08:00 IST');
};

module.exports = startCrons;
