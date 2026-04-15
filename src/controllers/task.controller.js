const Task = require("../models/Task");
const Completion = require("../models/Completion");
const { getSettings, normalizeDailyProgress } = require("../services/economy.service");
const {
  getRewardSnapshot,
  pickOffer,
  buildTrackedUrl,
  getTaskStateForUser,
  randomClickId,
  buildUserTaskCards
} = require("../services/task.service");
const { recordIdentity, evaluateRisk, applyRiskToUser } = require("../services/antiFraud.service");

function getIp(req) {
  return (req.headers["x-forwarded-for"] || req.ip || "").toString().split(",")[0].trim();
}

async function listTasks(req, res, next) {
  try {
    if (!req.user) {
      const tasks = await Task.find({ active: true }).sort({ sortOrder: 1 });
      return res.json(
        tasks.map((task) => ({
          id: task._id,
          slug: task.slug,
          title: task.title,
          category: task.category,
          description: task.description,
          rewardXp: getRewardSnapshot(task),
          ctaLabel: task.ctaLabel,
          available: false
        }))
      );
    }

    const cards = await buildUserTaskCards(req.user);
    return res.json(cards);
  } catch (error) {
    next(error);
  }
}

async function startTask(req, res, next) {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task || !task.active) {
      return res.status(404).json({ message: "Task not found or inactive." });
    }

    const taskState = await getTaskStateForUser(task, req.user);
    if (taskState.dailyLimitReached) {
      return res.status(400).json({ message: "Daily limit reached for this task." });
    }
    if (taskState.cooldownRemainingMinutes > 0) {
      return res.status(400).json({ message: `Task cooldown active for ${taskState.cooldownRemainingMinutes} more minutes.` });
    }

    const offer = pickOffer(task);
    if (!offer) {
      return res.status(400).json({ message: "No active CPA offer available for this task." });
    }

    const settings = await getSettings();
    normalizeDailyProgress(req.user);
    await req.user.save();

    if ((req.user.dailyEarnedXp || 0) >= settings.economy.dailyEarningCapXp) {
      return res.status(400).json({ message: "Daily earning cap reached. Please come back tomorrow." });
    }

    const ipAddress = getIp(req);
    const deviceFingerprint = String(req.body?.deviceFingerprint || "").slice(0, 200);
    await recordIdentity(req.user, ipAddress, deviceFingerprint);

    const risk = await evaluateRisk({
      user: req.user,
      ipAddress,
      deviceFingerprint,
      settings
    });
    applyRiskToUser(req.user, risk);
    await req.user.save();

    const clickId = randomClickId();
    const rewardXp = getRewardSnapshot(task);
    await Completion.create({
      clickId,
      user: req.user._id,
      task: task._id,
      taskSnapshot: {
        title: task.title,
        category: task.category,
        ctaLabel: task.ctaLabel
      },
      offerSnapshot: {
        name: offer.name,
        network: offer.network,
        url: offer.url,
        contentLocker: offer.contentLocker
      },
      rewardXp,
      ipAddress,
      deviceFingerprint,
      manualReviewRequired: risk.requiresManualReview,
      flags: risk.flags
    });

    const redirectUrl = buildTrackedUrl({
      offer,
      user: req.user,
      clickId
    });

    return res.json({
      success: true,
      clickId,
      task: {
        title: task.title,
        rewardXp
      },
      redirectUrl: offer.contentLocker ? null : redirectUrl,
      gateUrl: offer.contentLocker
        ? `/locker.html?clickId=${encodeURIComponent(clickId)}&seconds=${encodeURIComponent(
            settings.security.contentLockerSeconds
          )}`
        : null,
      contentLockerSeconds: settings.security.contentLockerSeconds
    });
  } catch (error) {
    next(error);
  }
}

async function getRedirectForClick(req, res, next) {
  try {
    const completion = await Completion.findOne({
      clickId: req.params.clickId,
      user: req.user._id
    });

    if (!completion) {
      return res.status(404).json({ message: "Task click not found." });
    }

    const redirectUrl = buildTrackedUrl({
      offer: {
        url: completion.offerSnapshot.url,
        subidParam: "subid",
        clickIdParam: "click_id"
      },
      user: req.user,
      clickId: completion.clickId
    });

    return res.json({ redirectUrl });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listTasks,
  startTask,
  getRedirectForClick
};
