const crypto = require("crypto");

function randomCode(prefix = "") {
  return `${prefix}${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function createReferralCode(name = "") {
  const cleanName = name.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase();
  return `${cleanName || "XPR"}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function createPublicId(prefix = "USR") {
  return `${prefix}-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
}

module.exports = {
  randomCode,
  createReferralCode,
  createPublicId
};
