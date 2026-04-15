const express = require("express");
const { optionalUser, requireUser } = require("../middleware/auth.middleware");
const { listTasks, startTask, getRedirectForClick } = require("../controllers/task.controller");

const router = express.Router();

router.get("/", optionalUser, listTasks);
router.post("/:taskId/start", requireUser, startTask);
router.get("/clicks/:clickId/redirect", requireUser, getRedirectForClick);

module.exports = router;
