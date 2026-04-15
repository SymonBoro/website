const mongoose = require("mongoose");

const identitySchema = new mongoose.Schema(
  {
    value: { type: String, required: true },
    lastSeenAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const flagSchema = new mongoose.Schema(
  {
    reason: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    active: { type: Boolean, default: true }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true, unique: true },
    googleId: { type: String, unique: true, sparse: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    referralCode: { type: String, required: true, unique: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    referralBonusCredited: { type: Boolean, default: false },
    roles: { type: [String], default: ["user"] },
    xpBalance: { type: Number, default: 0 },
    lifetimeXp: { type: Number, default: 0 },
    referralXp: { type: Number, default: 0 },
    totalWithdrawnInr: { type: Number, default: 0 },
    streakCount: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastApprovedTaskAt: { type: Date, default: null },
    dailyEarnedXp: { type: Number, default: 0 },
    dailyEarnedDate: { type: Date, default: null },
    isSuspicious: { type: Boolean, default: false },
    riskScore: { type: Number, default: 0 },
    flags: [flagSchema],
    ipHistory: [identitySchema],
    deviceFingerprints: [identitySchema],
    lastLoginAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
