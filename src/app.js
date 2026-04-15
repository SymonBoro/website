const path = require("path");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const passport = require("./config/passport")();

const authRoutes = require("./routes/auth.routes");
const publicRoutes = require("./routes/public.routes");
const userRoutes = require("./routes/user.routes");
const taskRoutes = require("./routes/task.routes");
const withdrawalRoutes = require("./routes/withdrawal.routes");
const adminRoutes = require("./routes/admin.routes");
const webhookRoutes = require("./routes/webhook.routes");
const { notFound, errorHandler } = require("./middleware/error.middleware");

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
  })
);
app.use(compression());
app.use(morgan("dev"));
app.use(express.json({ limit: "500kb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(passport.initialize());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 250,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/user", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/withdrawals", withdrawalRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/webhooks", webhookRoutes);

app.use(express.static(path.join(process.cwd(), "public")));

app.get("/", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "admin.html"));
});

app.get("/locker", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "locker.html"));
});

app.get("/terms", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "legal", "terms.html"));
});

app.get("/privacy", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "legal", "privacy.html"));
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
