const nodemailer = require('nodemailer');
const logger     = require('../config/logger');

const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST  || 'smtp.gmail.com',
  port:   parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_PORT  === '465',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  pool: true,              // reuse SMTP connections
  maxConnections: 5,
  rateDelta: 1000,
  rateLimit: 5,
});

const wrap = (title, body) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  body{font-family:Arial,sans-serif;background:#f0f7ff;margin:0;padding:0}
  .container{max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #d0e4f7}
  .header{background:linear-gradient(135deg,#0077cc,#0099ff);padding:28px 32px}
  .header h1{color:#fff;margin:0;font-size:22px}
  .header p{color:rgba(255,255,255,.8);margin:4px 0 0;font-size:13px}
  .body{padding:28px 32px}
  .body p{color:#4a5568;line-height:1.6;font-size:15px}
  .btn{display:inline-block;background:#0077cc;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin-top:16px}
  .info{background:#e6f2ff;border:1px solid #bee3f8;border-radius:8px;padding:14px 18px;margin:16px 0;color:#1a4a7a}
  .warn{background:#fffbea;border:1px solid #feebc8;border-radius:8px;padding:14px 18px;margin:16px 0;color:#92400e}
  .success{background:#f0fff4;border:1px solid #9ae6b4;border-radius:8px;padding:14px 18px;margin:16px 0;color:#276749}
  .footer{background:#f8fbff;padding:18px 32px;border-top:1px solid #d0e4f7;text-align:center;font-size:12px;color:#a0aec0}
  table{width:100%;border-collapse:collapse;margin:12px 0}
  th{background:#e8f2ff;color:#1a2332;padding:10px 8px;text-align:left;font-size:13px;font-weight:700}
  td{padding:10px 8px;border-bottom:1px solid #e8f2ff;font-size:14px;color:#4a5568}
  .badge-active{background:#d4edda;color:#155724;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700}
  .badge-stopped{background:#f8d7da;color:#721c24;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700}
</style></head>
<body><div class="container">
<div class="header"><h1>💊 ${title}</h1><p>MediScan — QR-Based Intelligent Medicine Information System</p></div>
<div class="body">${body}</div>
<div class="footer">Karpaga Vinayaga College of Engineering &amp; Technology · Anna University<br/>Automated message — please do not reply.</div>
</div></body></html>`;

// ── Core send helper ────────────────────────────────────────────────────────
const send = async ({ to, subject, html }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    logger.warn('Email not configured — skipping', { to, subject });
    return { skipped: true };
  }
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `MediScan <${process.env.EMAIL_USER}>`,
      to, subject, html,
    });
    logger.info('Email sent', { to, subject, messageId: info.messageId });
    return info;
  } catch (err) {
    logger.error('Email failed', { to, subject, error: err.message });
    throw err;   // let caller decide to swallow or re-throw
  }
};

// ── Welcome ─────────────────────────────────────────────────────────────────
const sendWelcome = (user) => send({
  to:      user.email,
  subject: 'Welcome to MediScan',
  html: wrap('Welcome!', `
    <p>Hi <strong>${user.name}</strong>,</p>
    <p>Your MediScan account is ready. You can now scan medicine QR codes, check interactions, and manage your health records.</p>
    <div class="info">
      <strong>Role:</strong> ${user.role}
      ${user.patientId ? ` &nbsp;|&nbsp; <strong>Patient ID:</strong> ${user.patientId}` : ''}
    </div>
    <a href="${process.env.CLIENT_URL}/dashboard" class="btn">Go to Dashboard →</a>
  `),
});

// ── Prescription notification (patient) ────────────────────────────────────
const sendPrescriptionNotification = (patient, treatment, prescriptions = []) => send({
  to:      patient.email,
  subject: `New Prescription — ${treatment.disease} | MediScan`,
  html: wrap('New Prescription Added', `
    <p>Hi <strong>${patient.name}</strong>,</p>
    <p>Dr. <strong>${treatment.doctorName}</strong> has added a new treatment record for you.</p>
    <div class="info">
      <strong>Diagnosis:</strong> ${treatment.disease}<br/>
      ${treatment.hospital ? `<strong>Hospital:</strong> ${treatment.hospital}<br/>` : ''}
      <strong>Type:</strong> ${treatment.type} &nbsp;|&nbsp; <strong>Severity:</strong> ${treatment.severity}<br/>
      ${treatment.notes ? `<strong>Doctor's notes:</strong> ${treatment.notes}` : ''}
    </div>
    ${prescriptions.length > 0 ? `
    <p><strong>Prescribed Medicines (${prescriptions.length}):</strong></p>
    <table>
      <tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Status</th></tr>
      ${prescriptions.map(p => `
        <tr>
          <td><strong>${p.medicineName || '—'}</strong></td>
          <td>${p.dosage    || '—'}</td>
          <td>${p.frequency || '—'}</td>
          <td>${p.duration  || '—'}</td>
          <td><span class="badge-${p.status === 'active' ? 'active' : 'stopped'}">${p.status || 'active'}</span></td>
        </tr>`).join('')}
    </table>
    ${prescriptions.some(p => p.instructions) ? `
    <div class="success">
      <strong>Special Instructions:</strong><br/>
      ${prescriptions.filter(p => p.instructions).map(p => `• <em>${p.medicineName}</em>: ${p.instructions}`).join('<br/>')}
    </div>` : ''}
    ` : '<p>No medicines prescribed at this time.</p>'}
    <div class="warn">Take medicines exactly as prescribed. Do not stop or change dosage without consulting your doctor.</div>
    <a href="${process.env.CLIENT_URL}/my-treatments" class="btn">View My Treatments →</a>
  `),
});

// ── Treatment updated ────────────────────────────────────────────────────────
const sendTreatmentUpdated = (patient, treatment) => send({
  to:      patient.email,
  subject: `Treatment Updated — ${treatment.disease} | MediScan`,
  html: wrap('Treatment Record Updated', `
    <p>Hi <strong>${patient.name}</strong>,</p>
    <p>Your treatment record for <strong>${treatment.disease}</strong> has been updated by Dr. ${treatment.doctorName}.</p>
    <div class="info">
      <strong>Status:</strong> ${treatment.status?.replace('_', ' ')} &nbsp;|&nbsp;
      <strong>Type:</strong>   ${treatment.type}<br/>
      ${treatment.notes ? `<strong>Notes:</strong> ${treatment.notes}` : ''}
    </div>
    <a href="${process.env.CLIENT_URL}/my-treatments" class="btn">View My Treatments →</a>
  `),
});

// ── Expiry alert (daily cron) ────────────────────────────────────────────────
const sendExpiryAlert = (user, medicines) => send({
  to:      user.email,
  subject: `Medicine Expiry Alert — ${medicines.length} item(s) need attention | MediScan`,
  html: wrap('Medicine Expiry Alert', `
    <p>Hi <strong>${user.name}</strong>,</p>
    <p>The following medicines in your saved list require attention:</p>
    <table>
      <tr><th>Medicine</th><th>Brand</th><th>Expiry Date</th><th>Status</th></tr>
      ${medicines.map(m => `
        <tr>
          <td><strong>${m.name}</strong></td>
          <td>${m.brand || '—'}</td>
          <td>${m.expiryDate ? new Date(m.expiryDate).toLocaleDateString('en-IN') : '—'}</td>
          <td style="color:${m.expiryStatus==='expired'?'#c53030':'#92400e'};font-weight:700">
            ${m.expiryStatus === 'expired' ? '🔴 EXPIRED' : '🟡 Near Expiry'}
          </td>
        </tr>`).join('')}
    </table>
    <div class="warn">Replace expired medicines immediately. Consult your pharmacist for near-expiry items.</div>
    <a href="${process.env.CLIENT_URL}/medicines" class="btn">View Medicines →</a>
  `),
});

// ── Password reset ───────────────────────────────────────────────────────────
const sendPasswordReset = (user, resetToken) => send({
  to:      user.email,
  subject: 'Reset your MediScan password',
  html: wrap('Password Reset', `
    <p>Hi <strong>${user.name}</strong>,</p>
    <p>Click the button below to reset your password. This link expires in <strong>15 minutes</strong>.</p>
    <a href="${process.env.CLIENT_URL}/reset-password?token=${resetToken}" class="btn">Reset Password →</a>
    <div class="info">If you did not request this, you can safely ignore this email. Your password will not change.</div>
  `),
});

// ── Medicine added (admin notification) ─────────────────────────────────────
const sendMedicineAdded = (admin, medicine) => send({
  to:      admin.email,
  subject: `New medicine added: ${medicine.name} | MediScan`,
  html: wrap('New Medicine Added', `
    <p>A new medicine has been added to MediScan:</p>
    <table>
      <tr><td style="font-weight:700">Name</td><td>${medicine.name}</td></tr>
      <tr><td style="font-weight:700">Generic</td><td>${medicine.genericName || '—'}</td></tr>
      <tr><td style="font-weight:700">Brand</td><td>${medicine.brand || '—'}</td></tr>
      <tr><td style="font-weight:700">Category</td><td>${medicine.category}</td></tr>
      <tr><td style="font-weight:700">Expiry</td><td>${medicine.expiryDate ? new Date(medicine.expiryDate).toLocaleDateString('en-IN') : '—'}</td></tr>
      <tr><td style="font-weight:700">Added by</td><td>${medicine.addedBy?.name || 'Unknown'}</td></tr>
    </table>
    <a href="${process.env.CLIENT_URL}/medicine/${medicine._id}" class="btn">View Medicine →</a>
  `),
});

module.exports = {
  sendWelcome,
  sendPrescriptionNotification,
  sendTreatmentUpdated,
  sendExpiryAlert,
  sendPasswordReset,
  sendMedicineAdded,
  wrap,
  send,
};
