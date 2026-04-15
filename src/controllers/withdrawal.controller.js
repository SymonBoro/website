const Withdrawal = require("../models/Withdrawal");
const { getSettings, inrToXp } = require("../services/economy.service");

async function listWithdrawals(req, res, next) {
  try {
    const withdrawals = await Withdrawal.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(
      withdrawals.map((entry) => ({
        id: entry._id,
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

async function createWithdrawal(req, res, next) {
  try {
    const { amount, method, paymentDetails } = req.body || {};
    const settings = await getSettings();
    const inrAmount = Number(amount);

    if (!Number.isFinite(inrAmount) || inrAmount <= 0 || !Number.isInteger(inrAmount)) {
      return res.status(400).json({ message: "Withdrawal amount must be a whole INR value." });
    }

    if (inrAmount < settings.economy.minimumWithdrawalInr) {
      return res
        .status(400)
        .json({ message: `Minimum withdrawal is INR ${settings.economy.minimumWithdrawalInr}.` });
    }

    if (!["UPI", "GOOGLE_PLAY_GIFT_CARD"].includes(method)) {
      return res.status(400).json({ message: "Invalid withdrawal method." });
    }

    if (!paymentDetails || String(paymentDetails).trim().length < 3) {
      return res.status(400).json({ message: "Payment details are required." });
    }

    const xpAmount = inrToXp(inrAmount, settings.economy.xpPerInr);
    if (req.user.xpBalance < xpAmount) {
      return res.status(400).json({ message: "Not enough XP balance for this withdrawal." });
    }

    req.user.xpBalance -= xpAmount;
    await req.user.save();

    const withdrawal = await Withdrawal.create({
      user: req.user._id,
      xpAmount,
      inrAmount,
      method,
      paymentDetails: String(paymentDetails).trim()
    });

    return res.status(201).json({
      success: true,
      withdrawal: {
        id: withdrawal._id,
        xpAmount,
        inrAmount,
        method,
        status: withdrawal.status
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listWithdrawals,
  createWithdrawal
};
