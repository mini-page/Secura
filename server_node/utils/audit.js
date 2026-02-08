const { v4: uuidv4 } = require("uuid");
const db = require("../db");

function logAudit({ userId, action, ipAddress }) {
  const stmt = db.prepare(
    "INSERT INTO audit_logs (log_id, user_id, action, ip_address, timestamp) VALUES (?, ?, ?, ?, ?)"
  );
  stmt.run(uuidv4(), userId, action, ipAddress, new Date().toISOString());
}

module.exports = { logAudit };
