const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/users", (req, res) => {
  const users = db
    .prepare("SELECT user_id, email, role, created_at FROM users ORDER BY created_at DESC")
    .all();
  return res.json(
    users.map((u) => ({
      id: u.user_id,
      email: u.email,
      role: u.role,
      createdAt: u.created_at
    }))
  );
});

router.get("/audit", (req, res) => {
  const logs = db
    .prepare("SELECT log_id, user_id, action, ip_address, timestamp FROM audit_logs ORDER BY timestamp DESC LIMIT 50")
    .all();
  return res.json(
    logs.map((row) => ({
      id: row.log_id,
      userId: row.user_id,
      action: row.action,
      ip: row.ip_address,
      timestamp: row.timestamp
    }))
  );
});

router.get("/summary", (req, res) => {
  const users = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
  const files = db.prepare("SELECT COUNT(*) as count FROM files").get().count;
  const uploads = db.prepare("SELECT COUNT(*) as count FROM audit_logs WHERE action = 'UPLOAD_FILE'").get().count;
  const downloads = db.prepare("SELECT COUNT(*) as count FROM audit_logs WHERE action = 'DOWNLOAD_FILE'").get().count;
  return res.json({ users, files, uploads, downloads });
});

router.get("/shares", (req, res) => {
  const rows = db
    .prepare(
      `SELECT sl.token, sl.expires_at, sl.created_at, f.original_name, u.email AS owner_email
       FROM share_links sl
       JOIN files f ON f.file_id = sl.file_id
       JOIN users u ON u.user_id = f.owner_id
       ORDER BY sl.created_at DESC`
    )
    .all();
  return res.json(
    rows.map((row) => ({
      token: row.token,
      fileName: row.original_name,
      owner: row.owner_email,
      expiresAt: row.expires_at,
      createdAt: row.created_at
    }))
  );
});

module.exports = router;
