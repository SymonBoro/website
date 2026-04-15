const mongoose = require("mongoose");

const completionSchema = new mongoose.Schema(
  {
    clickId: { type: String, required: true, unique: true },
    transactionId: { type: String, unique: true, sparse: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
    taskSnapshot: {
      title: String,
      category: String,
      ctaLabel: String
    },
    offerSnapshot: {
      name: String,
      network: String,
      url: String,
      contentLocker: Boolean
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    rewardXp: { type: Number, required: true },
    payoutInr: { type: Number, default: 0 },
    ipAddress: { type: String, default: "" },
    deviceFingerprint: { type: String, default: "" },
    postbackPayload: { type: mongoose.Schema.Types.Mixed, default: null },
    manualReviewRequired: { type: Boolean, default: false },
    flags: [{ type: String }],
    verifiedAt: { type: Date, default: null },
    creditedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Completion", completionSchema);
