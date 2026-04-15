const app = require("./app");
const env = require("./config/env");
const { connectDatabase } = require("./config/database");
const { seedDefaults } = require("./services/seed.service");

async function start() {
  await connectDatabase();
  await seedDefaults();

  app.listen(env.port, () => {
    console.log(`XP Reward running on ${env.appUrl}`);
  });
}

start().catch((error) => {
  console.error("Failed to start XP Reward", error);
  process.exit(1);
});
