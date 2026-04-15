const User = require("../models/User");

function upsertIdentity(list = [], value) {
  if (!value) {
    return list || [];
  }

  const next = Array.isArray(list) ? [...list] : [];
  const existing = next.find((entry) => entry.value === value);

  if (existing) {
    existing.lastSeenAt = new Date();
  } else {
    next.unshift({ value, lastSeenAt: new Date() });
  }

  return next.slice(0, 10);
}

async function recordIdentity(user, ipAddress, deviceFingerprint) {
  user.ipHistory = upsertIdentity(user.ipHistory, ipAddress);
  user.deviceFingerprints = upsertIdentity(user.deviceFingerprints, deviceFingerprint);
  await user.save();
  return user;
}

async function evaluateRisk({ user, ipAddress, deviceFingerprint, settings }) {
  const flags = [];
  let riskScore = user.riskScore || 0;

  if (deviceFingerprint) {
    const deviceCount = await User.countDocuments({
      _id: { $ne: user._id },
      "deviceFingerprints.value": deviceFingerprint
    });

    if (deviceCount + 1 > settings.security.maxAccountsPerDevice) {
      flags.push("Shared device detected");
      riskScore += 25;
    }
  }

  if (ipAddress) {
    const ipCount = await User.countDocuments({
      _id: { $ne: user._id },
      "ipHistory.value": ipAddress
    });

    if (ipCount + 1 > settings.security.maxAccountsPerIp) {
      flags.push("Too many accounts on the same IP");
      riskScore += 15;
    }
  }

  return {
    flags,
    riskScore,
    requiresManualReview: riskScore >= 40 || user.isSuspicious
  };
}

function applyRiskToUser(user, result) {
  user.riskScore = Math.max(user.riskScore || 0, result.riskScore);

  if (result.requiresManualReview) {
    user.isSuspicious = true;
  }

  for (const reason of result.flags) {
    const exists = user.flags.some((flag) => flag.reason === reason && flag.active);
    if (!exists) {
      user.flags.push({ reason, active: true });
    }
  }
}

module.exports = {
  recordIdentity,
  evaluateRisk,
  applyRiskToUser
};
