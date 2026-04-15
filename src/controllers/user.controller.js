const Completion = require("../models/Completion");
const Withdrawal = require("../models/Withdrawal");
const { buildUserTaskCards } = require("../services/task.service");
const { calculateLevel, getSettings, xpToInr } = require("../services/economy.service");

async function getDashboard(req, res, next) {
  try {
    const [settings, recentCompletions, recentWithdrawals, tasks] = await Promise.all([
      getSettings(),
      Completion.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(8),
      Withdrawal.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(8),
      buildUserTaskCards(req.user)
    ]);

    const level = calculateLevel(req.user.lifetimeXp);

    res.json({
      user: {
        id: req.user._id,
        publicId: req.user.publicId,
        displayName: req.user.displayName,
        firstName: req.user.firstName,
        email: req.user.email,
        avatarUrl: req.user.avatarUrl,
        referralCode: req.user.referralCode,
        xpBalance: req.user.xpBalance,
        inrBalance: xpToInr(req.user.xpBalance, settings.economy.xpPerInr),
        referralXp: req.user.referralXp,
        lifetimeXp: req.user.lifetimeXp,
        streakCount: req.user.streakCount,
        longestStreak: req.user.longestStreak,
        flags: req.user.flags.filter((flag) => flag.active),
        isSuspicious: req.user.isSuspicious,
        level
      },
      economy: settings.economy,
      referrals: {
        inviteBonusXp: settings.referrals.inviteBonusXp,
        shareUrl: `${req.protocol}://${req.get("host")}/?ref=${req.user.referralCode}`
      },
      tasks,
      recentCompletions: recentCompletions.map((entry) => ({
        id: entry._id,
        title: entry.taskSnapshot.title,
        rewardXp: entry.rewardXp,
        status: entry.status,
        createdAt: entry.createdAt
      })),
      recentWithdrawals: recentWithdrawals.map((entry) => ({
        id: entry._id,
        inrAmount: entry.inrAmount,
        method: entry.method,
        status: entry.status,
        createdAt: entry.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard
};
