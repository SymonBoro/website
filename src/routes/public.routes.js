const express = require("express");
const { getHomeSummary } = require("../controllers/public.controller");

const router = express.Router();

router.get("/home", getHomeSummary);

module.exports = router;
