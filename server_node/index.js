const express = require("express");
const cors = require("cors");
const config = require("./config");
const authRoutes = require("./routes/auth");
const fileRoutes = require("./routes/files");
const adminRoutes = require("./routes/admin");
const activityRoutes = require("./routes/activity");
const { authRequired, requireAdmin } = require("./middleware/auth");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.use("/auth", authRoutes);
app.use("/files", authRequired, fileRoutes);
app.use("/activity", authRequired, activityRoutes);
app.use("/admin", authRequired, requireAdmin, adminRoutes);

app.use((err, req, res, next) => {
  const message = err?.message || "Server error";
  return res.status(500).json({ error: message });
});

app.listen(config.port, () => {
  console.log(`SFSS API running on http://localhost:${config.port}`);
});
