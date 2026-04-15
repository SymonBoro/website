const User = require("../models/User");
const Task = require("../models/Task");
const Completion = require("../models/Completion");
const { randomCode } = require("../utils/crypto");
const { startOfDay, endOfDay } = require("../utils/date");
const { normalizeDailyProgress, updateStreak, getSettings } = require("./economy.service");

function getRewardSnapshot(task) {
  const bonusActive = task.bonusXp > 0 && task.bonusEndsAt && new Date(task.bonusEndsAt) > new Date();
  return task.rewardXp + (bonusActive ? task.bonusXp : 0);
}

function pickOffer(task) {
  const activeOffers = (task.offers || []).filter((offer) => offer.active);
  if (!activeOffers.length) {
    return null;
  }

  const totalWeight = activeOffers.reduce((sum, offer) => sum + (offer.rotationWeight || 1), 0);
  let threshold = Math.random() * totalWeight;

  for (const offer of activeOffers) {
    threshold -= offer.rotationWeight || 1;
    if (threshold <= 0) {
      return offer;
    }
  }

  return activeOffers[0];
}

function buildTrackedUrl({ offer, user, clickId }) {
  const url = new URL(offer.url);
  url.searchParams.set(offer.subidParam || "subid", String(user.publicId));
  url.searchParams.set(offer.clickIdParam || "click_id", clickId);
  url.searchParams.set("source", "xp_reward");
  return url.toString();
}

async function getTaskStateForUser(task, user) {
  const todayCount = await Completion.countDocuments({
    user: user._id,
    task: task._id,
    createdAt: { $gte: startOfDay(new Date()), $lte: endOfDay(new Date()) },
    status: { $in: ["pending", "approved"] }
  });

  const latestCompletion = await Completion.findOne({
    user: user._id,
    task: task._id,
    status: { $in: ["pending", "approved"] }
  }).sort({ createdAt: -1 });

  const cooldownRemainingMinutes = latestCompletion
    ? Math.max(
        0,
        Math.ceil(
          (new Date(latestCompletion.createdAt).getTime() + task.cooldownMinutes * 60 * 1000 - Date.now()) /
            (60 * 1000)
        )
      )
    : 0;

  return {
    completedToday: todayCount,
    dailyLimitReached: todayCount >= task.dailyLimitPerUser,
    cooldownRemainingMinutes,
    available: todayCount < task.dailyLimitPerUser && cooldownRemainingMinutes <= 0
  };
}

async function awardReferralBonusIfEligible(user, rewardAmount) {
  if (!user.referredBy || user.referralBonusCredited || rewardAmount <= 0) {
    return;
  }

  const referrer = await User.findById(user.referredBy);
  if (!referrer) {
    return;
  }

  referrer.xpBalance += rewardAmount;
  referrer.lifetimeXp += rewardAmount;
  referrer.referralXp += rewardAmount;
  await referrer.save();

  user.referralBonusCredited = true;
}

async function awardXpToUser({ userId, amount, completion }) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found while awarding XP.");
  }

  const settings = await getSettings();
  normalizeDailyProgress(user);
  user.xpBalance += amount;
  user.lifetimeXp += amount;
  user.dailyEarnedXp += amount;
  updateStreak(user, completion.verifiedAt || new Date());

  if (!completion.creditedAt) {
    completion.creditedAt = new Date();
  }

  await awardReferralBonusIfEligible(user, settings.referrals.inviteBonusXp);
  await user.save();
  await completion.save();

  return user;
}

async function buildUserTaskCards(user) {
  const tasks = await Task.find({ active: true }).sort({ sortOrder: 1, createdAt: 1 });
  const cards = [];

  for (const task of tasks) {
    const state = await getTaskStateForUser(task, user);
    cards.push({
      id: task._id,
      slug: task.slug,
      title: task.title,
      description: task.description,
      category: task.category,
      rewardXp: getRewardSnapshot(task),
      ctaLabel: task.ctaLabel,
      trustNote: task.trustNote,
      featured: task.featured,
      limitedTime: Boolean(task.bonusXp > 0 && task.bonusEndsAt && new Date(task.bonusEndsAt) > new Date()),
      ...state
    });
  }

  return cards;
}

module.exports = {
  getRewardSnapshot,
  pickOffer,
  buildTrackedUrl,
  getTaskStateForUser,
  awardXpToUser,
  buildUserTaskCards,
  randomClickId: () => randomCode("CLK-")
};
