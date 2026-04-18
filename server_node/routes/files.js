const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const config = require("../config");
const { encryptBuffer, decryptBuffer } = require("../utils/crypto");
const { logAudit } = require("../utils/audit");

const router = express.Router();

const UPLOAD_LIMIT_BYTES = 25 * 1024 * 1024; // 25 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_LIMIT_BYTES }
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Upload rate limit exceeded. Please slow down." }
});

function ensureOwnerOrAdmin(req, file) {
  return req.user.role === "admin" || file.owner_id === req.user.userId;
}

function sanitizeFilename(name) {
  return String(name).replace(/[\r\n"]/g, "_");
}

function buildEncryptedPackage(file, encryptedBuffer) {
  return {
    magic: "SECURA_ENC_V1",
    originalName: file.original_name,
    mimeType: file.mime_type || "application/octet-stream",
    iv: file.iv,
    authTag: file.auth_tag,
    ciphertext: encryptedBuffer.toString("base64")
  };
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
      logicalId: row.logical_id || row.file_id,
      ownerId: row.owner_id,
      originalName: row.original_name,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      version: row.version || 1,
      createdAt: row.created_at
    }))
  );
});

router.post("/upload", uploadLimiter, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "File required" });
  }
  if (req.file.size === 0) {
    return res.status(400).json({ error: "File is empty" });
  }

  const originalName = sanitizeFilename(req.file.originalname || "upload.bin");
  const fileId = uuidv4();
  const logicalId = uuidv4();

  // Determine version for this logical file (by normalised name per user)
  const existing = db
    .prepare(
      "SELECT logical_id, version FROM files WHERE owner_id = ? AND original_name = ? ORDER BY version DESC LIMIT 1"
    )
    .get(req.user.userId, originalName);

  const resolvedLogicalId = existing ? existing.logical_id : logicalId;
  const version = existing ? existing.version + 1 : 1;

  const { encrypted, iv, authTag } = encryptBuffer(req.file.buffer);
  const storagePath = path.join(config.storageDir, `${fileId}.bin`);

  fs.writeFileSync(storagePath, encrypted);

  db.prepare(
    `INSERT INTO files
      (file_id, logical_id, owner_id, original_name, mime_type, storage_path, size_bytes, iv, auth_tag, version, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    fileId,
    resolvedLogicalId,
    req.user.userId,
    originalName,
    req.file.mimetype || "application/octet-stream",
    storagePath,
    req.file.size,
    iv,
    authTag,
    version,
    new Date().toISOString()
  );

  logAudit({ userId: req.user.userId, action: "UPLOAD_FILE", ipAddress: req.ip });

  return res.json({
    fileId,
    originalName,
    sizeBytes: req.file.size,
    version,
    createdAt: new Date().toISOString()
  });
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
    logicalId: file.logical_id || file.file_id,
    ownerId: file.owner_id,
    originalName: file.original_name,
    mimeType: file.mime_type,
    sizeBytes: file.size_bytes,
    version: file.version || 1,
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
  res.setHeader("Content-Disposition", `attachment; filename="${sanitizeFilename(file.original_name)}"`);
  return res.send(decrypted);
});

router.get("/:id/download-encrypted", (req, res) => {
  const file = db.prepare("SELECT * FROM files WHERE file_id = ?").get(req.params.id);
  if (!file) {
    return res.status(404).json({ error: "File not found" });
  }
  if (!ensureOwnerOrAdmin(req, file)) {
    return res.status(403).json({ error: "Not allowed" });
  }

  const encrypted = fs.readFileSync(file.storage_path);
  const payload = buildEncryptedPackage(file, encrypted);
  const packageBuffer = Buffer.from(JSON.stringify(payload), "utf8");

  logAudit({ userId: req.user.userId, action: "DOWNLOAD_FILE", ipAddress: req.ip });

  const packageName = `${sanitizeFilename(file.original_name)}.secura`;
  res.setHeader("Content-Type", "application/vnd.secura.encrypted+json");
  res.setHeader("Content-Disposition", `attachment; filename="${packageName}"`);
  return res.send(packageBuffer);
});

router.post("/decrypt", uploadLimiter, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Encrypted file required" });
  }
  if (req.file.size === 0) {
    return res.status(400).json({ error: "File is empty" });
  }

  let payload;
  try {
    payload = JSON.parse(req.file.buffer.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Invalid encrypted file format" });
  }

  if (
    payload?.magic !== "SECURA_ENC_V1" ||
    typeof payload?.iv !== "string" ||
    typeof payload?.authTag !== "string" ||
    typeof payload?.ciphertext !== "string"
  ) {
    return res.status(400).json({ error: "Unsupported encrypted file format" });
  }

  try {
    const encryptedBuffer = Buffer.from(payload.ciphertext, "base64");
    const decrypted = decryptBuffer(encryptedBuffer, payload.iv, payload.authTag);
    const outputName = sanitizeFilename(payload.originalName || "decrypted.bin");
    const outputType = typeof payload.mimeType === "string" ? payload.mimeType : "application/octet-stream";

    logAudit({ userId: req.user.userId, action: "DECRYPT_FILE", ipAddress: req.ip });

    res.setHeader("Content-Type", outputType);
    res.setHeader("Content-Disposition", `attachment; filename="${outputName}"`);
    return res.send(decrypted);
  } catch {
    return res.status(400).json({ error: "Could not decrypt file" });
  }
});

router.delete("/:id", (req, res) => {
  const file = db.prepare("SELECT * FROM files WHERE file_id = ?").get(req.params.id);
  if (!file) {
    return res.status(404).json({ error: "File not found" });
  }
  if (!ensureOwnerOrAdmin(req, file)) {
    return res.status(403).json({ error: "Not allowed" });
  }

  try {
    fs.unlinkSync(file.storage_path);
  } catch (err) {
    if (err.code !== "ENOENT") {
      return res.status(500).json({ error: "Could not delete file from storage" });
    }
  }

  db.prepare("DELETE FROM share_links WHERE file_id = ?").run(req.params.id);
  db.prepare("DELETE FROM files WHERE file_id = ?").run(req.params.id);
  logAudit({ userId: req.user.userId, action: "DELETE_FILE", ipAddress: req.ip });
  return res.status(204).send();
});

router.post("/:id/share", (req, res) => {
  const file = db.prepare("SELECT * FROM files WHERE file_id = ?").get(req.params.id);
  if (!file) {
    return res.status(404).json({ error: "File not found" });
  }
  if (!ensureOwnerOrAdmin(req, file)) {
    return res.status(403).json({ error: "Not allowed" });
  }

  const expiresMinutes = Number(req.body?.expires_minutes) || 1440;
  const token = crypto.randomBytes(18).toString("base64url");
  const now = new Date();
  const expiresAt = expiresMinutes > 0
    ? new Date(now.getTime() + expiresMinutes * 60 * 1000).toISOString()
    : null;

  db.prepare(
    "INSERT INTO share_links (token, file_id, created_by, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(token, req.params.id, req.user.userId, expiresAt, now.toISOString());

  logAudit({ userId: req.user.userId, action: "SHARE_CREATED", ipAddress: req.ip });
  return res.json({ token, shareUrl: `/files/share/${token}`, expiresAt });
});

router.get("/:id/shares", (req, res) => {
  const file = db.prepare("SELECT * FROM files WHERE file_id = ?").get(req.params.id);
  if (!file) {
    return res.status(404).json({ error: "File not found" });
  }
  if (!ensureOwnerOrAdmin(req, file)) {
    return res.status(403).json({ error: "Not allowed" });
  }

  const rows = db
    .prepare("SELECT token, expires_at, created_at FROM share_links WHERE file_id = ? ORDER BY created_at DESC")
    .all(req.params.id);

  return res.json(
    rows.map((row) => ({
      token: row.token,
      expiresAt: row.expires_at,
      createdAt: row.created_at
    }))
  );
});

router.delete("/share/:token/revoke", (req, res) => {
  const share = db
    .prepare("SELECT sl.*, f.owner_id FROM share_links sl JOIN files f ON f.file_id = sl.file_id WHERE sl.token = ?")
    .get(req.params.token);
  if (!share) {
    return res.status(404).json({ error: "Share link not found" });
  }
  if (req.user.role !== "admin" && share.owner_id !== req.user.userId) {
    return res.status(403).json({ error: "Not allowed" });
  }

  db.prepare("DELETE FROM share_links WHERE token = ?").run(req.params.token);
  logAudit({ userId: req.user.userId, action: "SHARE_REVOKED", ipAddress: req.ip });
  return res.status(204).send();
});

module.exports = router;
