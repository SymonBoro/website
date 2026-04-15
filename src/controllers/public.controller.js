const User = require("../models/User");
const Task = require("../models/Task");
const Completion = require("../models/Completion");
const { getSettings, xpToInr } = require("../services/economy.service");
const { startOfDay } = require("../utils/date");
const env = require("../config/env");

function anonymizeName(name = "User") {
  const parts = name.trim().split(" ").filter(Boolean);
  if (!parts.length) {
    return "User";
  }
  if (parts.length === 1) {
    return `${parts[0].slice(0, 1)}***`;
  }
  return `${parts[0]} ${parts[1].slice(0, 1)}.`;
}

async function getHomeSummary(_req, res, next) {
  try {
    const [settings, tasks, usersCount, totals, recentApproved] = await Promise.all([
      getSettings(),
      Task.find({ active: true }).sort({ sortOrder: 1 }).limit(4),
      User.countDocuments(),
      User.aggregate([
        {
          $group: {
            _id: null,
            lifetimeXp: { $sum: "$lifetimeXp" }
          }
        }
      ]),
      Completion.find({ status: "approved" })
        .populate("user", "displayName")
        .sort({ verifiedAt: -1 })
        .limit(8)
    ]);

    const todayApproved = await Completion.aggregate([
      {
        $match: {
          status: "approved",
          verifiedAt: { $gte: startOfDay(new Date()) }
        }
      },
      {
        $group: {
          _id: null,
          todayXp: { $sum: "$rewardXp" }
        }
      }
    ]);

    const liveFeed = recentApproved.map((entry) => ({
      id: entry._id,
      text: `${anonymizeName(entry.user?.displayName)} earned ${entry.rewardXp} XP from ${entry.taskSnapshot.title}`,
      createdAt: entry.verifiedAt || entry.updatedAt
    }));

    return res.json({
      brand: "XP Reward",
      googleConfigured: env.googleConfigured,
      settings: {
        xpPerInr: settings.economy.xpPerInr,
        minimumWithdrawalInr: settings.economy.minimumWithdrawalInr
      },
      stats: {
        totalUsers: usersCount,
        xpDistributed: totals[0]?.lifetimeXp || 0,
        dailyEarningsInr: xpToInr(todayApproved[0]?.todayXp || 0, settings.economy.xpPerInr)
      },
      taskPreview: tasks.map((task) => ({
        id: task._id,
        title: task.title,
        category: task.category,
        rewardXp: task.rewardXp + (task.bonusXp || 0)
      })),
      liveFeed
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getHomeSummary
};
