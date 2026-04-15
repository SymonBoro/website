const Task = require("../models/Task");
const Setting = require("../models/Setting");
const env = require("../config/env");

const defaultTasks = [
  {
    slug: "gmail-submit",
    category: "Gmail Submit",
    title: "Verified Gmail Submit",
    description: "Complete a verified Gmail lead form and wait for CPA approval.",
    rewardXp: 50,
    ctaLabel: "Open Gmail Task",
    featured: true,
    dailyLimitPerUser: 2,
    cooldownMinutes: 180,
    sortOrder: 1,
    offers: [
      {
        name: "Primary Gmail Lead",
        network: "CPA Network A",
        url: "https://example.com/gmail-offer",
        rotationWeight: 2,
        contentLocker: false
      },
      {
        name: "Gmail Survey Backup",
        network: "CPA Network B",
        url: "https://example.com/gmail-offer-2",
        rotationWeight: 1,
        contentLocker: true
      }
    ]
  },
  {
    slug: "zip-submit",
    category: "ZIP Code Submit",
    title: "Location Check Offer",
    description: "Submit a ZIP code on a geo-targeted offer and wait for confirmation.",
    rewardXp: 50,
    ctaLabel: "Submit ZIP Code",
    dailyLimitPerUser: 2,
    cooldownMinutes: 240,
    sortOrder: 2,
    offers: [
      {
        name: "Geo Offer",
        network: "CPA Network A",
        url: "https://example.com/zip-offer",
        rotationWeight: 1,
        contentLocker: false
      }
    ]
  },
  {
    slug: "app-install",
    category: "App Install",
    title: "Install & Open Partner App",
    description: "Install an approved app through the tracked link and open it once.",
    rewardXp: 200,
    bonusXp: 50,
    bonusEndsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    ctaLabel: "Install App",
    featured: true,
    dailyLimitPerUser: 1,
    cooldownMinutes: 1440,
    sortOrder: 3,
    offers: [
      {
        name: "Android App Install",
        network: "CPA Network C",
        url: "https://example.com/app-install",
        rotationWeight: 1,
        contentLocker: true
      }
    ]
  },
  {
    slug: "quick-task",
    category: "Quick Task",
    title: "Quick Verification Task",
    description: "Finish a short partner action with fraud checks and CPA validation.",
    rewardXp: 100,
    ctaLabel: "Do Quick Task",
    dailyLimitPerUser: 3,
    cooldownMinutes: 90,
    sortOrder: 4,
    offers: [
      {
        name: "Quick Survey",
        network: "CPA Network D",
        url: "https://example.com/quick-task",
        rotationWeight: 1,
        contentLocker: false
      }
    ]
  }
];

async function seedDefaults() {
  const existingSettings = await Setting.findOne({ key: "global" });
  if (!existingSettings) {
    await Setting.create({
      key: "global",
      economy: {
        xpPerInr: env.defaultXpPerInr,
        minimumWithdrawalInr: env.minimumWithdrawalInr,
        dailyEarningCapXp: env.dailyEarningCapXp
      },
      referrals: {
        inviteBonusXp: env.referralInviteXp
      },
      security: {
        contentLockerSeconds: env.contentLockerSeconds,
        maxAccountsPerDevice: env.maxAccountsPerDevice,
        maxAccountsPerIp: env.maxAccountsPerIp
      }
    });
  }

  for (const task of defaultTasks) {
    await Task.findOneAndUpdate({ slug: task.slug }, task, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    });
  }
}

module.exports = {
  seedDefaults
};
