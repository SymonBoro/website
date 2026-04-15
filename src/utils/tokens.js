const jwt = require("jsonwebtoken");
const env = require("../config/env");

const USER_COOKIE = "xp_reward_user_token";
const ADMIN_COOKIE = "xp_reward_admin_token";
const REFERRAL_COOKIE = "xp_reward_referral";

function signToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.cookieSecure,
    path: "/"
  };
}

function setUserCookie(res, payload) {
  res.cookie(USER_COOKIE, signToken(payload), cookieOptions());
}

function setAdminCookie(res, payload) {
  res.cookie(ADMIN_COOKIE, signToken(payload), cookieOptions());
}

function setReferralCookie(res, referralCode) {
  res.cookie(REFERRAL_COOKIE, signToken({ referralCode }), {
    ...cookieOptions(),
    maxAge: 1000 * 60 * 60 * 24
  });
}

function clearUserCookie(res) {
  res.clearCookie(USER_COOKIE, cookieOptions());
}

function clearAdminCookie(res) {
  res.clearCookie(ADMIN_COOKIE, cookieOptions());
}

function clearReferralCookie(res) {
  res.clearCookie(REFERRAL_COOKIE, cookieOptions());
}

module.exports = {
  USER_COOKIE,
  ADMIN_COOKIE,
  REFERRAL_COOKIE,
  signToken,
  verifyToken,
  setUserCookie,
  setAdminCookie,
  setReferralCookie,
  clearUserCookie,
  clearAdminCookie,
  clearReferralCookie
};
