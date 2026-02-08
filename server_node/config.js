const fs = require("fs");
const path = require("path");
require("dotenv").config();

const DATA_DIR = path.join(__dirname, "data");
const STORAGE_DIR = path.join(__dirname, "storage");
const KEY_FILE = path.join(DATA_DIR, ".demo-key");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function loadOrCreateKey() {
  ensureDir(DATA_DIR);
  if (process.env.SFSS_MASTER_KEY) {
    return Buffer.from(process.env.SFSS_MASTER_KEY, "base64");
  }
  if (fs.existsSync(KEY_FILE)) {
    return Buffer.from(fs.readFileSync(KEY_FILE, "utf8"), "base64");
  }
  const key = Buffer.from(require("crypto").randomBytes(32));
  fs.writeFileSync(KEY_FILE, key.toString("base64"), "utf8");
  return key;
}

const config = {
  port: process.env.PORT ? Number(process.env.PORT) : 3000,
  jwtSecret: process.env.SFSS_JWT_SECRET || "sfss-demo-jwt-secret",
  storageDir: STORAGE_DIR,
  dbPath: path.join(DATA_DIR, "sfss.db"),
  masterKey: loadOrCreateKey()
};

ensureDir(STORAGE_DIR);

module.exports = config;
