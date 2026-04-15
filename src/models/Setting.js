const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    economy: {
      xpPerInr: { type: Number, default: 1000 },
      minimumWithdrawalInr: { type: Number, default: 100 },
      dailyEarningCapXp: { type: Number, default: 25000 }
    },
    referrals: {
      inviteBonusXp: { type: Number, default: 500 }
    },
    security: {
      contentLockerSeconds: { type: Number, default: 5 },
      maxAccountsPerDevice: { type: Number, default: 2 },
      maxAccountsPerIp: { type: Number, default: 4 }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Setting", settingSchema);
