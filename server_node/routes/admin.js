const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/users", (req, res) => {
  const users = db
    .prepare("SELECT user_id, email, role, created_at FROM users ORDER BY created_at DESC")
    .all();
  return res.json(users);
});

router.get("/audit", (req, res) => {
  const logs = db
    .prepare("SELECT log_id, user_id, action, ip_address, timestamp FROM audit_logs ORDER BY timestamp DESC")
    .all();
  return res.json(logs);
});

module.exports = router;
