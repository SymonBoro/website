const express = require("express");
const { requireAdmin } = require("../middleware/auth.middleware");
const {
  getOverview,
  listUsers,
  updateUser,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  listCompletions,
  updateCompletion,
  listWithdrawals,
  updateWithdrawal,
  updateSettings
} = require("../controllers/admin.controller");

const router = express.Router();

router.use(requireAdmin);

router.get("/overview", getOverview);
router.get("/users", listUsers);
router.patch("/users/:userId", updateUser);
router.get("/tasks", listTasks);
router.post("/tasks", createTask);
router.patch("/tasks/:taskId", updateTask);
router.delete("/tasks/:taskId", deleteTask);
router.get("/completions", listCompletions);
router.patch("/completions/:completionId", updateCompletion);
router.get("/withdrawals", listWithdrawals);
router.patch("/withdrawals/:withdrawalId", updateWithdrawal);
router.patch("/settings", updateSettings);

module.exports = router;
