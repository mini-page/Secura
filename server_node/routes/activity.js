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

module.exports = router;
