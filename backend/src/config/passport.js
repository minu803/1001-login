const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const { User, ROLES } = require('../models/User');
const jwtService = require('../utils/jwt');

const setupPassport = (app) => {
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
      scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const { id, displayName, emails, photos } = profile;
        const email = emails[0].value;
        const avatar = photos[0]?.value;

        // Check if user exists with this email or Google ID
        let user = await User.findByEmailOrProvider(email, 'google', id);

        if (user) {
          // Update Google provider info if not already linked
          if (!user.providers.some(p => p.provider === 'google')) {
            user.addProvider('google', id, email, displayName);
            user.isEmailVerified = true; // Google emails are verified
            await user.save();
          }
        } else {
          // Create new user
          user = await User.create({
            name: displayName || 'Google User',
            email: email,
            role: ROLES.LEARNER,
            isEmailVerified: true,
            providers: [{
              provider: 'google',
              providerId: id,
              email: email,
              displayName: displayName
            }],
            profile: {
              avatar: avatar
            },
            termsAccepted: {
              version: '1.0',
              acceptedAt: new Date()
            },
            privacyPolicyAccepted: {
              version: '1.0',
              acceptedAt: new Date()
            }
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }));
  }

  // Facebook OAuth Strategy
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "/api/auth/facebook/callback",
      profileFields: ['id', 'displayName', 'photos', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const { id, displayName, emails, photos } = profile;
        const email = emails?.[0]?.value;
        const avatar = photos?.[0]?.value;

        if (!email) {
          return done(new Error('No email provided by Facebook'), null);
        }

        let user = await User.findByEmailOrProvider(email, 'facebook', id);

        if (user) {
          if (!user.providers.some(p => p.provider === 'facebook')) {
            user.addProvider('facebook', id, email, displayName);
            await user.save();
          }
        } else {
          user = await User.create({
            name: displayName || 'Facebook User',
            email: email,
            role: ROLES.LEARNER,
            isEmailVerified: true,
            providers: [{
              provider: 'facebook',
              providerId: id,
              email: email,
              displayName: displayName
            }],
            profile: {
              avatar: avatar
            },
            termsAccepted: {
              version: '1.0',
              acceptedAt: new Date()
            },
            privacyPolicyAccepted: {
              version: '1.0',
              acceptedAt: new Date()
            }
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }));
  }

  // GitHub OAuth Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "/api/auth/github/callback",
      scope: ['user:email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const { id, displayName, username, emails, photos } = profile;
        const email = emails?.[0]?.value;
        const avatar = photos?.[0]?.value;

        if (!email) {
          return done(new Error('No email provided by GitHub'), null);
        }

        let user = await User.findByEmailOrProvider(email, 'github', id);

        if (user) {
          if (!user.providers.some(p => p.provider === 'github')) {
            user.addProvider('github', id, email, displayName || username);
            await user.save();
          }
        } else {
          user = await User.create({
            name: displayName || username || 'GitHub User',
            email: email,
            role: ROLES.LEARNER,
            isEmailVerified: true,
            providers: [{
              provider: 'github',
              providerId: id,
              email: email,
              displayName: displayName || username
            }],
            profile: {
              avatar: avatar
            },
            termsAccepted: {
              version: '1.0',
              acceptedAt: new Date()
            },
            privacyPolicyAccepted: {
              version: '1.0',
              acceptedAt: new Date()
            }
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }));
  }

  // OAuth routes
  
  // Google OAuth
  app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/api/auth/google/callback',
    passport.authenticate('google', { session: false }),
    (req, res) => {
      try {
        // Generate JWT tokens
        const tokens = jwtService.generateTokenPair(req.user);

        // Set secure cookie with refresh token
        res.cookie('refreshToken', tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000
        });

        // Redirect to frontend with access token
        const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${tokens.accessToken}&provider=google`;
        res.redirect(redirectUrl);
      } catch (error) {
        console.error('Google OAuth callback error:', error);
        res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=OAuth authentication failed`);
      }
    }
  );

  // Facebook OAuth
  app.get('/api/auth/facebook',
    passport.authenticate('facebook', { scope: ['email'] })
  );

  app.get('/api/auth/facebook/callback',
    passport.authenticate('facebook', { session: false }),
    (req, res) => {
      try {
        const tokens = jwtService.generateTokenPair(req.user);

        res.cookie('refreshToken', tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${tokens.accessToken}&provider=facebook`;
        res.redirect(redirectUrl);
      } catch (error) {
        console.error('Facebook OAuth callback error:', error);
        res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=OAuth authentication failed`);
      }
    }
  );

  // GitHub OAuth
  app.get('/api/auth/github',
    passport.authenticate('github', { scope: ['user:email'] })
  );

  app.get('/api/auth/github/callback',
    passport.authenticate('github', { session: false }),
    (req, res) => {
      try {
        const tokens = jwtService.generateTokenPair(req.user);

        res.cookie('refreshToken', tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${tokens.accessToken}&provider=github`;
        res.redirect(redirectUrl);
      } catch (error) {
        console.error('GitHub OAuth callback error:', error);
        res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=OAuth authentication failed`);
      }
    }
  );

  console.log('🔐 Passport.js OAuth strategies configured');
};

module.exports = { setupPassport };
