const Task = require("../models/Task");
const User = require("../models/User");
const Completion = require("../models/Completion");
const Withdrawal = require("../models/Withdrawal");
const { getSettings, xpToInr } = require("../services/economy.service");
const { awardXpToUser } = require("../services/task.service");

async function getOverview(_req, res, next) {
  try {
    const [settings, totalUsers, suspiciousUsers, pendingCompletions, pendingWithdrawals, latestCompletions] =
      await Promise.all([
        getSettings(),
        User.countDocuments(),
        User.countDocuments({ isSuspicious: true }),
        Completion.countDocuments({ status: "pending" }),
        Withdrawal.countDocuments({ status: "pending" }),
        Completion.find().sort({ createdAt: -1 }).limit(10)
      ]);

    res.json({
      settings,
      summary: {
        totalUsers,
        suspiciousUsers,
        pendingCompletions,
        pendingWithdrawals
      },
      feed: latestCompletions.map((entry) => ({
        id: entry._id,
        task: entry.taskSnapshot.title,
        rewardXp: entry.rewardXp,
        status: entry.status,
        createdAt: entry.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
}

async function listUsers(_req, res, next) {
  try {
    const settings = await getSettings();
    const users = await User.find().sort({ createdAt: -1 }).limit(100);

    res.json(
      users.map((user) => ({
        id: user._id,
        publicId: user.publicId,
        displayName: user.displayName,
        email: user.email,
        xpBalance: user.xpBalance,
        inrBalance: xpToInr(user.xpBalance, settings.economy.xpPerInr),
        lifetimeXp: user.lifetimeXp,
        streakCount: user.streakCount,
        isSuspicious: user.isSuspicious,
        flags: user.flags.filter((flag) => flag.active),
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }))
    );
  } catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const xpDelta = Number(req.body?.xpDelta || 0);
    const flagReason = String(req.body?.flagReason || "").trim();
    const clearFlags = Boolean(req.body?.clearFlags);

    if (Number.isFinite(xpDelta) && xpDelta !== 0) {
      user.xpBalance = Math.max(0, user.xpBalance + xpDelta);
      user.lifetimeXp = Math.max(user.lifetimeXp, user.lifetimeXp + Math.max(0, xpDelta));
    }

    if (flagReason) {
      user.isSuspicious = true;
      user.flags.push({ reason: flagReason, active: true });
    }

    if (clearFlags) {
      user.isSuspicious = false;
      user.flags = user.flags.map((flag) => ({
        reason: flag.reason,
        createdAt: flag.createdAt,
        active: false
      }));
      user.riskScore = 0;
    }

    await user.save();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

async function listTasks(_req, res, next) {
  try {
    const tasks = await Task.find().sort({ sortOrder: 1, createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    next(error);
  }
}

async function createTask(req, res, next) {
  try {
    const task = await Task.create(req.body);
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
}

async function updateTask(req, res, next) {
  try {
    const task = await Task.findByIdAndUpdate(req.params.taskId, req.body, {
      new: true,
      runValidators: true
    });
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }
    res.json(task);
  } catch (error) {
    next(error);
  }
}

async function deleteTask(req, res, next) {
  try {
    const deleted = await Task.findByIdAndDelete(req.params.taskId);
    if (!deleted) {
      return res.status(404).json({ message: "Task not found." });
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

async function listCompletions(_req, res, next) {
  try {
    const completions = await Completion.find()
      .populate("user", "displayName publicId email")
      .sort({ createdAt: -1 })
      .limit(200);

    res.json(
      completions.map((entry) => ({
        id: entry._id,
        clickId: entry.clickId,
        user: entry.user,
        title: entry.taskSnapshot.title,
        rewardXp: entry.rewardXp,
        status: entry.status,
        flags: entry.flags,
        manualReviewRequired: entry.manualReviewRequired,
        createdAt: entry.createdAt
      }))
    );
  } catch (error) {
    next(error);
  }
}

async function updateCompletion(req, res, next) {
  try {
    const { status, rejectionReason } = req.body || {};
    const completion = await Completion.findById(req.params.completionId);
    if (!completion) {
      return res.status(404).json({ message: "Completion not found." });
    }

    if (completion.status !== "pending") {
      return res.status(400).json({ message: "Only pending task completions can be reviewed." });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid completion status." });
    }

    completion.status = status;
    completion.verifiedAt = new Date();
    completion.rejectionReason = status === "rejected" ? String(rejectionReason || "Rejected by admin.") : "";

    if (status === "approved") {
      await awardXpToUser({
        userId: completion.user,
        amount: completion.rewardXp,
        completion
      });
    } else {
      await completion.save();
    }

    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

async function listWithdrawals(_req, res, next) {
  try {
    const withdrawals = await Withdrawal.find()
      .populate("user", "displayName publicId email")
      .sort({ createdAt: -1 })
      .limit(200);

    res.json(
      withdrawals.map((entry) => ({
        id: entry._id,
        user: entry.user,
        xpAmount: entry.xpAmount,
        inrAmount: entry.inrAmount,
        method: entry.method,
        paymentDetails: entry.paymentDetails,
        status: entry.status,
        createdAt: entry.createdAt
      }))
    );
  } catch (error) {
    next(error);
  }
}

async function updateWithdrawal(req, res, next) {
  try {
    const { status } = req.body || {};
    const withdrawal = await Withdrawal.findById(req.params.withdrawalId);
    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal not found." });
    }

    if (!["approved", "paid", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid withdrawal status." });
    }

    const previousStatus = withdrawal.status;
    const wasPaid = Boolean(withdrawal.paidAt);
    withdrawal.status = status;
    withdrawal.processedBy = req.admin.email || "admin";
    if (status === "paid" && !wasPaid) {
      withdrawal.paidAt = new Date();
      const user = await User.findById(withdrawal.user);
      if (user) {
        user.totalWithdrawnInr += withdrawal.inrAmount;
        await user.save();
      }
    }

    if (status === "rejected" && !withdrawal.refundIssued && previousStatus !== "paid") {
      const user = await User.findById(withdrawal.user);
      if (user) {
        user.xpBalance += withdrawal.xpAmount;
        await user.save();
      }
      withdrawal.refundIssued = true;
    }

    await withdrawal.save();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

async function updateSettings(req, res, next) {
  try {
    const settings = await getSettings();
    settings.economy.xpPerInr = Number(req.body?.economy?.xpPerInr || settings.economy.xpPerInr);
    settings.economy.minimumWithdrawalInr = Number(
      req.body?.economy?.minimumWithdrawalInr || settings.economy.minimumWithdrawalInr
    );
    settings.economy.dailyEarningCapXp = Number(
      req.body?.economy?.dailyEarningCapXp || settings.economy.dailyEarningCapXp
    );
    settings.referrals.inviteBonusXp = Number(
      req.body?.referrals?.inviteBonusXp || settings.referrals.inviteBonusXp
    );
    settings.security.contentLockerSeconds = Number(
      req.body?.security?.contentLockerSeconds || settings.security.contentLockerSeconds
    );
    settings.security.maxAccountsPerDevice = Number(
      req.body?.security?.maxAccountsPerDevice || settings.security.maxAccountsPerDevice
    );
    settings.security.maxAccountsPerIp = Number(
      req.body?.security?.maxAccountsPerIp || settings.security.maxAccountsPerIp
    );
    await settings.save();
    res.json(settings);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOverview,
  listUsers,
  updateUser,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  listCompletions,
  updateCompletion,
  listWithdrawals,
  updateWithdrawal,
  updateSettings
};
