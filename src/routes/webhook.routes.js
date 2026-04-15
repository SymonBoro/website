const express = require("express");
const { handleCpaPostback } = require("../controllers/webhook.controller");

const router = express.Router();

router.get("/cpa", handleCpaPostback);

module.exports = router;
