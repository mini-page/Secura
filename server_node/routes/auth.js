const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const config = require("../config");
const { logAudit } = require("../utils/audit");

const router = express.Router();

router.post("/register", (req, res) => {
  const { email, password, role } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }
  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = db.prepare("SELECT user_id FROM users WHERE email = ?").get(normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }
  const passwordHash = bcrypt.hashSync(password, 10);
  const userId = uuidv4();
  const userRole = role === "admin" ? "admin" : "user";

  db.prepare(
    "INSERT INTO users (user_id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(userId, normalizedEmail, passwordHash, userRole, new Date().toISOString());

  logAudit({ userId, action: "REGISTER", ipAddress: req.ip });

  const token = jwt.sign({ userId, role: userRole, email: normalizedEmail }, config.jwtSecret, {
    expiresIn: "8h"
  });
  return res.json({ token, user: { userId, email: normalizedEmail, role: userRole } });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }
  const normalizedEmail = String(email).toLowerCase().trim();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(normalizedEmail);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  logAudit({ userId: user.user_id, action: "LOGIN", ipAddress: req.ip });

  const token = jwt.sign(
    { userId: user.user_id, role: user.role, email: user.email },
    config.jwtSecret,
    { expiresIn: "8h" }
  );
  return res.json({
    token,
    user: { userId: user.user_id, email: user.email, role: user.role }
  });
});

router.post("/guest", (req, res) => {
  const guestEmail = "guest@sfss.local";
  let user = db.prepare("SELECT * FROM users WHERE email = ?").get(guestEmail);
  if (!user) {
    const userId = uuidv4();
    const passwordHash = bcrypt.hashSync(uuidv4(), 10);
    db.prepare(
      "INSERT INTO users (user_id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(userId, guestEmail, passwordHash, "guest", new Date().toISOString());
    user = db.prepare("SELECT * FROM users WHERE email = ?").get(guestEmail);
  }

  logAudit({ userId: user.user_id, action: "GUEST_LOGIN", ipAddress: req.ip });

  const token = jwt.sign(
    { userId: user.user_id, role: user.role, email: user.email },
    config.jwtSecret,
    { expiresIn: "4h" }
  );
  return res.json({
    token,
    user: { userId: user.user_id, email: user.email, role: user.role }
  });
});

module.exports = router;
