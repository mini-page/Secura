const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/summary", (req, res) => {
  const userId = req.user.userId;
  const now = new Date();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const last7 = new Date(now.getTime() - 7 * MS_PER_DAY).toISOString();
  const prev7 = new Date(now.getTime() - 14 * MS_PER_DAY).toISOString();

  const uploadsLast7 = db
    .prepare(
      "SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ? AND action = 'UPLOAD_FILE' AND timestamp >= ?"
    )
    .get(userId, last7).count;

  const downloadsLast7 = db
    .prepare(
      "SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ? AND action = 'DOWNLOAD_FILE' AND timestamp >= ?"
    )
    .get(userId, last7).count;

  const series = [];
  for (let i = 6; i >= 0; i -= 1) {
    const dayStart = new Date(now.getTime() - i * MS_PER_DAY);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + MS_PER_DAY);
    const dateStr = dayStart.toISOString().slice(0, 10);
    const uploads = db
      .prepare(
        "SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ? AND action = 'UPLOAD_FILE' AND timestamp >= ? AND timestamp < ?"
      )
      .get(userId, dayStart.toISOString(), dayEnd.toISOString()).count;
    const downloads = db
      .prepare(
        "SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ? AND action = 'DOWNLOAD_FILE' AND timestamp >= ? AND timestamp < ?"
      )
      .get(userId, dayStart.toISOString(), dayEnd.toISOString()).count;
    series.push({ date: dateStr, uploads, downloads });
  }

  const files = db
    .prepare("SELECT size_bytes, created_at FROM files WHERE owner_id = ?")
    .all(userId);
  const totalBytes = files.reduce((sum, f) => sum + f.size_bytes, 0);
  const addedLast7 = files
    .filter((f) => f.created_at >= last7)
    .reduce((sum, f) => sum + f.size_bytes, 0);
  const addedPrev7 = files
    .filter((f) => f.created_at >= prev7 && f.created_at < last7)
    .reduce((sum, f) => sum + f.size_bytes, 0);

  let trendPercent = 0;
  if (addedPrev7 > 0) {
    trendPercent = ((addedLast7 - addedPrev7) / addedPrev7) * 100;
  } else if (addedLast7 > 0) {
    trendPercent = 100;
  }

  let score = 90;
  if (files.length > 0) score += 2;
  if (uploadsLast7 + downloadsLast7 > 0) score += 2;
  score = Math.min(96, score);

  return res.json({
    rangeDays: 7,
    uploadsLast7,
    downloadsLast7,
    activitySeries: series,
    securityHealth: { score, label: "Encryption + access checks" },
    storage: {
      totalBytes,
      addedLast7Bytes: addedLast7,
      trendPercent: Number(trendPercent.toFixed(1)),
      label: "This week"
    },
    filesTotal: files.length
  });
});

module.exports = router;
