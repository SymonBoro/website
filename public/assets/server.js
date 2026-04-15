const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect("mongodb://127.0.0.1:27017/xp_reward");

const UserSchema = new mongoose.Schema({
  username: String,
  xp: { type: Number, default: 0 }
});

const User = mongoose.model("User", UserSchema);

let currentUser = null;

app.post("/api/login", async (req, res) => {
  const { username } = req.body;

  let user = await User.findOne({ username });

  if (!user) {
    user = await User.create({ username });
  }

  currentUser = user;
  res.json(user);
});

app.get("/api/user", async (req, res) => {
  if (!currentUser) return res.status(401).json({ message: "Not logged in" });
  res.json(currentUser);
});

app.post("/api/task", async (req, res) => {
  if (!currentUser) return res.status(401).json({ message: "Login first" });

  const { xp } = req.body;

  currentUser.xp += xp;
  await currentUser.save();

  res.json({ xp: currentUser.xp });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
