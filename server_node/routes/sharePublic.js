const express = require("express");
const fs = require("fs");
const db = require("../db");
const { decryptBuffer } = require("../utils/crypto");
const { logAudit } = require("../utils/audit");

const router = express.Router();

// Public share download – no authentication required
router.get("/:token", (req, res) => {
  const share = db
    .prepare(
      "SELECT sl.*, f.file_id, f.original_name, f.mime_type, f.storage_path, f.iv, f.auth_tag, f.owner_id FROM share_links sl JOIN files f ON f.file_id = sl.file_id WHERE sl.token = ?"
    )
    .get(req.params.token);

  if (!share) {
    return res.status(404).json({ error: "Share link not found" });
  }

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return res.status(410).json({ error: "Share link has expired" });
  }

  if (!fs.existsSync(share.storage_path)) {
    return res.status(404).json({ error: "File not found" });
  }

  const encrypted = fs.readFileSync(share.storage_path);
  const decrypted = decryptBuffer(encrypted, share.iv, share.auth_tag);

  logAudit({ userId: share.owner_id, action: "SHARE_DOWNLOADED", ipAddress: req.ip });

  res.setHeader("Content-Type", share.mime_type || "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${share.original_name}"`);
  return res.send(decrypted);
});

module.exports = router;
