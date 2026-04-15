const Setting = require("../models/Setting");
const env = require("../config/env");
const { isSameDay, isYesterday, startOfDay } = require("../utils/date");

async function getSettings() {
  let settings = await Setting.findOne({ key: "global" });

  if (!settings) {
    settings = await Setting.create({
      key: "global",
      economy: {
        xpPerInr: env.defaultXpPerInr,
        minimumWithdrawalInr: env.minimumWithdrawalInr,
        dailyEarningCapXp: env.dailyEarningCapXp
      },
      referrals: {
        inviteBonusXp: env.referralInviteXp
      },
      security: {
        contentLockerSeconds: env.contentLockerSeconds,
        maxAccountsPerDevice: env.maxAccountsPerDevice,
        maxAccountsPerIp: env.maxAccountsPerIp
      }
    });
  }

  return settings;
}

function xpToInr(xp, xpPerInr) {
  return Number((xp / xpPerInr).toFixed(2));
}

function inrToXp(inr, xpPerInr) {
  return Math.round(Number(inr) * xpPerInr);
}

function calculateLevel(totalXp) {
  const currentLevel = Math.max(1, Math.floor(totalXp / 5000) + 1);
  const currentFloor = (currentLevel - 1) * 5000;
  const nextLevelTarget = currentLevel * 5000;
  const progress = Math.min(100, Math.round(((totalXp - currentFloor) / 5000) * 100));

  return {
    currentLevel,
    currentFloor,
    nextLevelTarget,
    progress
  };
}

function normalizeDailyProgress(user) {
  if (!user.dailyEarnedDate || !isSameDay(user.dailyEarnedDate, new Date())) {
    user.dailyEarnedDate = startOfDay(new Date());
    user.dailyEarnedXp = 0;
  }
}

function updateStreak(user, approvalDate = new Date()) {
  if (!user.lastApprovedTaskAt) {
    user.streakCount = 1;
    user.longestStreak = Math.max(user.longestStreak || 0, 1);
    user.lastApprovedTaskAt = approvalDate;
    return;
  }

  if (isSameDay(user.lastApprovedTaskAt, approvalDate)) {
    user.lastApprovedTaskAt = approvalDate;
    return;
  }

  if (isYesterday(user.lastApprovedTaskAt, approvalDate)) {
    user.streakCount += 1;
  } else {
    user.streakCount = 1;
  }

  user.longestStreak = Math.max(user.longestStreak || 0, user.streakCount);
  user.lastApprovedTaskAt = approvalDate;
}

module.exports = {
  getSettings,
  xpToInr,
  inrToXp,
  calculateLevel,
  normalizeDailyProgress,
  updateStreak
};
