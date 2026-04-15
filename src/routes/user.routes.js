const express = require("express");
const { requireUser } = require("../middleware/auth.middleware");
const { getDashboard } = require("../controllers/user.controller");

const router = express.Router();

router.get("/dashboard", requireUser, getDashboard);

module.exports = router;
