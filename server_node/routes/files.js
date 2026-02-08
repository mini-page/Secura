const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const config = require("../config");
const { encryptBuffer, decryptBuffer } = require("../utils/crypto");
const { logAudit } = require("../utils/audit");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

function ensureOwnerOrAdmin(req, file) {
  return req.user.role === "admin" || file.owner_id === req.user.userId;
}

router.get("/", (req, res) => {
  const isAdmin = req.user.role === "admin";
  const rows = isAdmin
    ? db.prepare("SELECT * FROM files ORDER BY created_at DESC").all()
    : db
        .prepare("SELECT * FROM files WHERE owner_id = ? ORDER BY created_at DESC")
        .all(req.user.userId);

  return res.json(
    rows.map((row) => ({
      fileId: row.file_id,
      ownerId: row.owner_id,
      originalName: row.original_name,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      createdAt: row.created_at
    }))
  );
});

router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "File required" });
  }
  const fileId = uuidv4();
  const { encrypted, iv, authTag } = encryptBuffer(req.file.buffer);
  const storagePath = path.join(config.storageDir, `${fileId}.bin`);

  fs.writeFileSync(storagePath, encrypted);

  db.prepare(
    `INSERT INTO files
      (file_id, owner_id, original_name, mime_type, storage_path, size_bytes, iv, auth_tag, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    fileId,
    req.user.userId,
    req.file.originalname,
    req.file.mimetype || "application/octet-stream",
    storagePath,
    req.file.size,
    iv,
    authTag,
    new Date().toISOString()
  );

  logAudit({ userId: req.user.userId, action: "UPLOAD_FILE", ipAddress: req.ip });

  return res.json({ fileId });
});

router.get("/:id", (req, res) => {
  const file = db.prepare("SELECT * FROM files WHERE file_id = ?").get(req.params.id);
  if (!file) {
    return res.status(404).json({ error: "File not found" });
  }
  if (!ensureOwnerOrAdmin(req, file)) {
    return res.status(403).json({ error: "Not allowed" });
  }
  return res.json({
    fileId: file.file_id,
    ownerId: file.owner_id,
    originalName: file.original_name,
    mimeType: file.mime_type,
    sizeBytes: file.size_bytes,
    createdAt: file.created_at
  });
});

router.get("/:id/download", (req, res) => {
  const file = db.prepare("SELECT * FROM files WHERE file_id = ?").get(req.params.id);
  if (!file) {
    return res.status(404).json({ error: "File not found" });
  }
  if (!ensureOwnerOrAdmin(req, file)) {
    return res.status(403).json({ error: "Not allowed" });
  }

  const encrypted = fs.readFileSync(file.storage_path);
  const decrypted = decryptBuffer(encrypted, file.iv, file.auth_tag);

  logAudit({ userId: req.user.userId, action: "DOWNLOAD_FILE", ipAddress: req.ip });

  res.setHeader("Content-Type", file.mime_type);
  res.setHeader("Content-Disposition", `attachment; filename="${file.original_name}"`);
  return res.send(decrypted);
});

module.exports = router;
