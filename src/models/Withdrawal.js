const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    xpAmount: { type: Number, required: true },
    inrAmount: { type: Number, required: true },
    method: {
      type: String,
      enum: ["UPI", "GOOGLE_PLAY_GIFT_CARD"],
      required: true
    },
    paymentDetails: { type: String, required: true },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "paid", "rejected"],
      default: "pending"
    },
    refundIssued: { type: Boolean, default: false },
    processedBy: { type: String, default: "" },
    paidAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Withdrawal", withdrawalSchema);
