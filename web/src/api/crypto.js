/**
 * Secura Client-Side Encryption Utilities
 * Uses the Web Crypto API (SubtleCrypto)
 * Standard: AES-GCM 256-bit + PBKDF2 (100,000 iterations)
 */

const ALGO = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const ITERATIONS = 100000;

/**
 * Derives an AES-GCM key from a password and salt using PBKDF2
 */
async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    passwordKey,
    { name: ALGO, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts an ArrayBuffer using a password.
 * Structure: [SALT (16B)] [IV (12B)] [CIPHERTEXT (...)]
 */
export async function encryptBuffer(buffer, password) {
  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password, salt);

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    buffer
  );

  // Combine SALT + IV + Ciphertext
  const result = new Uint8Array(SALT_LENGTH + IV_LENGTH + ciphertext.byteLength);
  result.set(salt, 0);
  result.set(iv, SALT_LENGTH);
  result.set(new Uint8Array(ciphertext), SALT_LENGTH + IV_LENGTH);
  return result.buffer;
}

/**
 * Decrypts a buffer using a password.
 * Extracts SALT and IV from the start of the buffer.
 */
export async function decryptBuffer(buffer, password) {
  const bytes = new Uint8Array(buffer);
  
  if (bytes.length < SALT_LENGTH + IV_LENGTH) {
    throw new Error("Invalid secure container format");
  }

  const salt = bytes.slice(0, SALT_LENGTH);
  const iv = bytes.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = bytes.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(password, salt);

  return window.crypto.subtle.decrypt(
    { name: ALGO, iv },
    key,
    ciphertext
  );
}

/**
 * Utility to trigger a browser download
 */
export function triggerDownload(buffer, fileName) {
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

