const jwt    = require('jsonwebtoken');
const QRCode = require('qrcode');
const User   = require('../models/User');
const email  = require('../utils/emailService');
const logger = require('../config/logger');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '30d' });

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      _id:        user._id,
      name:       user.name,
      email:      user.email,
      avatar:     user.avatar,
      role:       user.role,
      provider:   user.provider,
      isVerified: user.isVerified,
      patientId:  user.patientId,
      createdAt:  user.createdAt,
    },
  });
};

// ── Register ───────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email: userEmail, password, role, dateOfBirth, gender, contact, bloodGroup } = req.body;

    if (await User.findOne({ email: userEmail }))
      return res.status(400).json({ success: false, message: 'Email already registered.' });

    const user = await User.create({
      name, email: userEmail, password,
      role: role || 'patient',
      provider: 'local',
      isVerified: true,    // TODO: add email OTP verification in v3
      dateOfBirth, gender, contact, bloodGroup,
    });

    // Generate patient QR code
    if (user.role === 'patient') {
      const qrData = JSON.stringify({
        type:      'patient',
        patientId: user.patientId,
        userId:    user._id,
        name:      user.name,
        url:       `${process.env.CLIENT_URL}/patient/${user._id}`,
      });
      user.qrCode     = await QRCode.toDataURL(qrData, { errorCorrectionLevel: 'H', width: 256 });
      user.qrCodeData = qrData;
      await user.save();
    }

    // BUG FIX: was calling `email && email.sendWelcome` — sendWelcome is always a function
    email.sendWelcome(user).catch(err =>
      logger.warn('Welcome email failed', { error: err.message })
    );

    sendTokenResponse(user, 201, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Login ──────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email: userEmail, password } = req.body;
    if (!userEmail || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required.' });

    const user = await User.findOne({ email: userEmail }).select('+password');

    // BUG FIX: separate "wrong provider" vs "not found" to avoid leaking info
    if (!user)
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    if (user.provider !== 'local')
      return res.status(401).json({ success: false, message: 'Please sign in with Google or GitHub.' });

    if (!user.isActive)
      return res.status(403).json({ success: false, message: 'Account has been deactivated. Contact support.' });

    const match = await user.comparePassword(password);
    if (!match)
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get current user ───────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('savedMedicines', 'name brand category expiryStatus qrCode');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update profile ─────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const allowed = [
      'name','avatar','dateOfBirth','gender','contact','address',
      'bloodGroup','allergies','emergencyContact',
      'specialization','licenseNumber','hospital','yearsOfExperience',
    ];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const user = await User.findByIdAndUpdate(
      req.user._id, updates, { new: true, runValidators: true }
    );
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Change password ────────────────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: 'Both passwords are required.' });

    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });

    const user = await User.findById(req.user._id).select('+password');
    if (user.provider !== 'local')
      return res.status(400).json({ success: false, message: 'OAuth users cannot change password here.' });

    const match = await user.comparePassword(currentPassword);
    if (!match)
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });

    // BUG FIX: also check new !== old
    const sameAsOld = await user.comparePassword(newPassword);
    if (sameAsOld)
      return res.status(400).json({ success: false, message: 'New password must be different from current password.' });

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── OAuth callback ─────────────────────────────────────────────────────────
exports.oauthCallback = async (req, res) => {
  try {
    const token = generateToken(req.user._id);
    res.redirect(`${process.env.CLIENT_URL}/auth/oauth-success?token=${token}`);
  } catch (err) {
    logger.error('OAuth callback error', { error: err.message });
    res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
  }
};

// ── Get all users (admin) ──────────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 20, search } = req.query;
    const pageNum  = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const query    = {};

    if (role)   query.role = role;
    if (search) query.$or  = [
      { name:  { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];

    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
    ]);

    res.json({
      success: true,
      users,
      pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Deactivate user (admin) ────────────────────────────────────────────────
exports.deactivateUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ success: false, message: 'Cannot deactivate your own account.' });

    const user = await User.findByIdAndUpdate(
      req.params.id, { isActive: false }, { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'User deactivated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
