const express  = require('express');
const passport = require('passport');
const router   = express.Router();

const {
  register, login, getMe, updateProfile,
  changePassword, oauthCallback, getAllUsers, deactivateUser,
} = require('../controllers/authController');
const { protect, authorize }            = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validate');
const audit                               = require('../middleware/audit');

router.post('/register', validateRegister, register);
router.post('/login',    validateLogin,    login);
router.get ('/me',       protect,          getMe);
router.put ('/profile',  protect,          updateProfile);
router.put ('/change-password', protect,   changePassword);

// Admin
router.get   ('/users',        protect, authorize('admin'), getAllUsers);
router.patch ('/users/:id/deactivate', protect, authorize('admin'),
  audit('DEACTIVATE_USER', 'User'), deactivateUser);

// Google OAuth
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google_failed`,
    session: false,
  }),
  oauthCallback
);

// GitHub OAuth
router.get('/github',
  passport.authenticate('github', { scope: ['user:email'], session: false }));
router.get('/github/callback',
  passport.authenticate('github', {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=github_failed`,
    session: false,
  }),
  oauthCallback
);

module.exports = router;
