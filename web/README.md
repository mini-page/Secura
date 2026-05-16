# Secura Web: The Privacy Sandbox 🔒

The Secura Web Client is a professional-grade, high-security portal that operates as a **Zero-Knowledge Local Sandbox**. It allows users to secure sensitive data without ever trusting a server with their plaintext files or passwords.

## 🛠️ High-Level Architecture
- **Local Cryptography:** Uses the W3C Web Crypto API (SubtleCrypto) for all operations.
- **Key Derivation:** Implements PBKDF2-HMAC-SHA256 with 100k iterations locally.
- **Privacy First:** Your passwords and raw keys never leave browser memory.
- **Ecosystem Bridge:** Synchronizes file metadata (checksums, sizes) with the Django backend for a persistent, cross-device activity log.

## 🚀 Setup & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Dev Server
```bash
npm run dev
```

The app is built with **Vite + React** and is optimized for modern browsers that support the Web Crypto API.

## 🗝️ Core Security Workflows

### 1. Encryption
- User selects a file and enters a password in the **Security Vault**.
- The browser generates a unique 16B salt and 12B IV.
- AES-256-GCM encryption is performed.
- A metadata packet is sent to the Django API to update your cloud activity ledger.
- A portable `.secura` container is downloaded to your device.

### 2. Decryption
- User uploads a `.secura` file.
- The **Security Vault** prompts for the password.
- The salt/IV are extracted from the container, and the key is derived.
- Data is restored in-browser for preview or download.

### 3. Decoy Vault
- If a user enters their configured **Decoy Password**, the system triggers a "Fake Restore" protocol to protect real data under duress.

## 📑 Tech Stack
- **Framework:** React 19 (Vite)
- **Styling:** Vanilla CSS (Modern CSS variables + Spacing Grid)
- **Security:** W3C Web Crypto API
- **Auth:** Google OAuth2 + JWT
