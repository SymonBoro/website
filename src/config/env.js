const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const port = parseNumber(process.env.PORT, 5000);

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port,
  appUrl: process.env.APP_URL || `http://localhost:${port}`,
  mongodbUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/xp_reward",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || `http://localhost:${port}/api/auth/google/callback`,
  adminEmail: process.env.ADMIN_EMAIL || "admin@xpreward.com",
  adminPassword: process.env.ADMIN_PASSWORD || "",
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || "",
  defaultXpPerInr: parseNumber(process.env.DEFAULT_XP_PER_INR, 1000),
  minimumWithdrawalInr: parseNumber(process.env.MIN_WITHDRAWAL_INR, 100),
  dailyEarningCapXp: parseNumber(process.env.DAILY_EARNING_CAP_XP, 25000),
  referralInviteXp: parseNumber(process.env.REFERRAL_INVITE_XP, 500),
  contentLockerSeconds: parseNumber(process.env.CONTENT_LOCKER_SECONDS, 5),
  maxAccountsPerDevice: parseNumber(process.env.MAX_ACCOUNTS_PER_DEVICE, 2),
  maxAccountsPerIp: parseNumber(process.env.MAX_ACCOUNTS_PER_IP, 4),
  cpaPostbackSecret: process.env.CPA_POSTBACK_SECRET || "postback-secret-change-me",
  googleConfigured: Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL
  )
};
