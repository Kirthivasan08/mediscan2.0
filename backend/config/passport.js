const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ────────────────────────────── Google OAuth ──────────────────────────────
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
callbackURL: `${process.env.SERVER_URL}https://mediscan-yvaz.onrender.com/api/auth/google/callback`,    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        // Check if user already exists via googleId
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          // Check if email already registered locally
          user = await User.findOne({ email: profile.emails[0].value });
          if (user) {
            user.googleId = profile.id;
            if (!user.avatar) user.avatar = profile.photos[0]?.value;
            await user.save();
          } else {
            // Create brand new user
            user = await User.create({
              googleId:   profile.id,
              name:       profile.displayName,
              email:      profile.emails[0].value,
              avatar:     profile.photos[0]?.value || '',
              provider:   'google',
              isVerified: true,
              role:       'patient',
            });
          }
        }
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// ────────────────────────────── GitHub OAuth ──────────────────────────────
passport.use(
  new GitHubStrategy(
    {
      clientID:    process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL}/api/auth/github/callback`,
      scope: ['user:email'],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ githubId: profile.id });
        if (!user) {
          const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;
          user = await User.findOne({ email });
          if (user) {
            user.githubId = profile.id;
            if (!user.avatar) user.avatar = profile.photos[0]?.value;
            await user.save();
          } else {
            user = await User.create({
              githubId:   profile.id,
              name:       profile.displayName || profile.username,
              email,
              avatar:     profile.photos[0]?.value || '',
              provider:   'github',
              isVerified: true,
              role:       'patient',
            });
          }
        }
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

module.exports = passport;
