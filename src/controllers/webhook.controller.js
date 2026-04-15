const Completion = require("../models/Completion");
const User = require("../models/User");
const env = require("../config/env");
const { awardXpToUser } = require("../services/task.service");

function isApprovedStatus(status) {
  const normalized = String(status || "").toLowerCase();
  return ["approved", "success", "1", "ok", "converted"].includes(normalized);
}

async function handleCpaPostback(req, res, next) {
  try {
    const secret = String(req.query.secret || "");
    if (secret !== env.cpaPostbackSecret) {
      return res.status(401).json({ message: "Invalid postback secret." });
    }

    const clickId = String(req.query.click_id || req.query.clickid || "");
    const subid = String(req.query.subid || "");
    const transactionId = String(req.query.transaction_id || req.query.txn_id || "");
    const payout = Number(req.query.payout || 0);
    const status = String(req.query.status || req.query.conversion_status || "approved");

    let completion = null;

    if (clickId) {
      completion = await Completion.findOne({ clickId });
    }

    if (!completion && subid) {
      const user = await User.findOne({ publicId: subid });
      if (user) {
        completion = await Completion.findOne({
          user: user._id,
          status: "pending"
        }).sort({ createdAt: -1 });
      }
    }

    if (!completion) {
      return res.status(404).json({ message: "Completion not found." });
    }

    if (completion.status === "approved") {
      return res.json({ success: true, message: "Completion already approved." });
    }

    completion.transactionId = transactionId || completion.transactionId;
    completion.payoutInr = payout || completion.payoutInr;
    completion.postbackPayload = req.query;

    if (!isApprovedStatus(status)) {
      completion.status = "rejected";
      completion.rejectionReason = `CPA rejected conversion with status "${status}".`;
      completion.verifiedAt = new Date();
      await completion.save();
      return res.json({ success: true, message: "Completion rejected." });
    }

    if (completion.manualReviewRequired) {
      await completion.save();
      return res.json({ success: true, message: "Completion saved for manual review." });
    }

    completion.status = "approved";
    completion.verifiedAt = new Date();
    await awardXpToUser({
      userId: completion.user,
      amount: completion.rewardXp,
      completion
    });

    return res.json({ success: true, message: "XP credited." });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleCpaPostback
};
