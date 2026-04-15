const bcrypt = require("bcryptjs");
const passport = require("passport");
const env = require("../config/env");
const User = require("../models/User");
const { createPublicId, createReferralCode } = require("../utils/crypto");
const {
  setUserCookie,
  setAdminCookie,
  clearUserCookie,
  clearAdminCookie,
  setReferralCookie,
  clearReferralCookie,
  REFERRAL_COOKIE,
  verifyToken
} = require("../utils/tokens");

async function getUniqueReferralCode(displayName) {
  let code = createReferralCode(displayName);

  while (await User.exists({ referralCode: code })) {
    code = createReferralCode(displayName);
  }

  return code;
}

function startGoogleAuth(req, res, next) {
  if (!env.googleConfigured) {
    return res.redirect("/?authError=google-not-configured");
  }

  const referralCode = req.query.ref ? String(req.query.ref).trim().toUpperCase() : "";
  if (referralCode) {
    setReferralCookie(res, referralCode);
  }

  return passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false
  })(req, res, next);
}

function googleCallback(req, res, next) {
  return passport.authenticate("google", { session: false }, async (error, profile) => {
    try {
      if (error || !profile) {
        return res.redirect("/?authError=google-login-failed");
      }

      let user = await User.findOne({
        $or: [{ googleId: profile.googleId }, { email: profile.email }]
      });

      if (!user) {
        const referralCode = await getUniqueReferralCode(profile.displayName);
        const publicId = createPublicId("USR");
        user = new User({
          publicId,
          googleId: profile.googleId,
          email: profile.email,
          displayName: profile.displayName,
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatarUrl: profile.avatarUrl,
          referralCode
        });
      } else {
        user.googleId = profile.googleId;
        user.email = profile.email;
        user.displayName = profile.displayName;
        user.firstName = profile.firstName;
        user.lastName = profile.lastName;
        user.avatarUrl = profile.avatarUrl;
      }

      const referralToken = req.cookies?.[REFERRAL_COOKIE];
      if (!user.referredBy && referralToken) {
        try {
          const referralPayload = verifyToken(referralToken);
          const referrer = await User.findOne({ referralCode: referralPayload.referralCode });
          if (referrer && String(referrer._id) !== String(user._id)) {
            user.referredBy = referrer._id;
          }
        } catch (_referralError) {
        }
      }

      user.lastLoginAt = new Date();
      await user.save();

      setUserCookie(res, {
        userId: user._id,
        publicId: user.publicId,
        roles: user.roles
      });
      clearReferralCookie(res);

      return res.redirect("/#dashboard");
    } catch (controllerError) {
      return next(controllerError);
    }
  })(req, res, next);
}

function getMe(req, res) {
  if (!req.user) {
    return res.json({
      authenticated: false,
      googleConfigured: env.googleConfigured
    });
  }

  return res.json({
    authenticated: true,
    googleConfigured: env.googleConfigured,
    user: {
      id: req.user._id,
      publicId: req.user.publicId,
      displayName: req.user.displayName,
      firstName: req.user.firstName,
      avatarUrl: req.user.avatarUrl,
      email: req.user.email,
      referralCode: req.user.referralCode,
      roles: req.user.roles
    }
  });
}

function logout(req, res) {
  clearUserCookie(res);
  clearAdminCookie(res);
  return res.json({ success: true });
}

async function adminLogin(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const normalizedEmail = String(email).toLowerCase();
  if (normalizedEmail !== env.adminEmail.toLowerCase()) {
    return res.status(401).json({ message: "Invalid admin credentials." });
  }

  let valid = false;

  if (env.adminPasswordHash) {
    valid = await bcrypt.compare(password, env.adminPasswordHash);
  } else if (env.adminPassword) {
    valid = password === env.adminPassword;
  }

  if (!valid) {
    return res.status(401).json({ message: "Invalid admin credentials." });
  }

  setAdminCookie(res, {
    email: normalizedEmail,
    role: "admin"
  });

  return res.json({
    success: true,
    admin: {
      email: normalizedEmail
    }
  });
}

module.exports = {
  startGoogleAuth,
  googleCallback,
  getMe,
  logout,
  adminLogin
};
