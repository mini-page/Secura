const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/", (req, res) => {
  const isAdmin = req.user.role === "admin";
  const rows = isAdmin
    ? db
        .prepare(
          "SELECT log_id, user_id, action, timestamp FROM audit_logs ORDER BY timestamp DESC LIMIT 100"
        )
        .all()
    : db
        .prepare(
          "SELECT log_id, user_id, action, timestamp FROM audit_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 100"
        )
        .all(req.user.userId);

  return res.json(
    rows.map((row) => ({
      id: row.log_id,
      userId: row.user_id,
      action: row.action,
      timestamp: row.timestamp
    }))
  );
});

router.get("/export", (req, res) => {
  const rows = db
    .prepare(
      "SELECT log_id, action, timestamp, ip_address FROM audit_logs WHERE user_id = ? ORDER BY timestamp DESC"
    )
    .all(req.user.userId);

  function csvField(value) {
    const str = String(value == null ? "" : value);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  let csv = "id,action,timestamp,ip\n";
  for (const row of rows) {
    csv += `${csvField(row.log_id)},${csvField(row.action)},${csvField(row.timestamp)},${csvField(row.ip_address)}\n`;
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="audit.csv"');
  return res.send(csv);
});

module.exports = router;
