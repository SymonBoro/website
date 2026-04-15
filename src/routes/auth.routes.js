const express = require("express");
const {
  startGoogleAuth,
  googleCallback,
  getMe,
  logout,
  adminLogin
} = require("../controllers/auth.controller");
const { optionalUser } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/google", startGoogleAuth);
router.get("/google/callback", googleCallback);
router.get("/me", optionalUser, getMe);
router.post("/logout", logout);
router.post("/admin/login", adminLogin);

module.exports = router;
