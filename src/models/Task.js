const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    network: { type: String, default: "" },
    url: { type: String, required: true },
    rotationWeight: { type: Number, default: 1 },
    contentLocker: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    subidParam: { type: String, default: "subid" },
    clickIdParam: { type: String, default: "click_id" }
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ["Gmail Submit", "ZIP Code Submit", "App Install", "Quick Task"]
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    rewardXp: { type: Number, required: true, min: 1 },
    bonusXp: { type: Number, default: 0 },
    bonusEndsAt: { type: Date, default: null },
    ctaLabel: { type: String, default: "Start Task" },
    trustNote: { type: String, default: "Verified via CPA postback before XP is credited." },
    dailyLimitPerUser: { type: Number, default: 1 },
    cooldownMinutes: { type: Number, default: 1440 },
    active: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    offers: [offerSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
