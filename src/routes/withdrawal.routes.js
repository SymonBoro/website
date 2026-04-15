const express = require("express");
const { requireUser } = require("../middleware/auth.middleware");
const { listWithdrawals, createWithdrawal } = require("../controllers/withdrawal.controller");

const router = express.Router();

router.get("/", requireUser, listWithdrawals);
router.post("/", requireUser, createWithdrawal);

module.exports = router;
