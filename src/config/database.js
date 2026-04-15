const mongoose = require("mongoose");
const env = require("./env");

async function connectDatabase() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongodbUri, {
    autoIndex: true
  });
  return mongoose.connection;
}

module.exports = {
  connectDatabase
};
