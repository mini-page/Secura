const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const config = require("./config");
const authRoutes = require("./routes/auth");
const fileRoutes = require("./routes/files");
const adminRoutes = require("./routes/admin");
const activityRoutes = require("./routes/activity");
const analyticsRoutes = require("./routes/analytics");
const sharePublicRoutes = require("./routes/sharePublic");
const { authRequired, requireAdmin } = require("./middleware/auth");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// ── Rate limiting ────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in 15 minutes." }
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Upload rate limit exceeded. Please slow down." }
});

const shareDownloadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." }
});

// General limiter for authenticated API routes
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.use("/auth", authLimiter, authRoutes);
// Public share download must be registered before the authenticated /files mount
app.use("/files/share", shareDownloadLimiter, sharePublicRoutes);
app.use("/files", authRequired, apiLimiter, fileRoutes);
app.use("/activity", authRequired, apiLimiter, activityRoutes);
app.use("/analytics", authRequired, apiLimiter, analyticsRoutes);
app.use("/admin-api", authRequired, requireAdmin, apiLimiter, adminRoutes);

app.use((err, req, res, next) => {
  const message = err?.message || "Server error";
  return res.status(500).json({ error: message });
});

app.listen(config.port, () => {
  console.log(`SFSS API running on http://localhost:${config.port}`);
});
