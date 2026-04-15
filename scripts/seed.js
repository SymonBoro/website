const { connectDatabase } = require("../src/config/database");
const { seedDefaults } = require("../src/services/seed.service");

async function run() {
  await connectDatabase();
  await seedDefaults();
  console.log("Seed completed.");
  process.exit(0);
}

run().catch((error) => {
  console.error("Seed failed.", error);
  process.exit(1);
});
