# Secura (SFSS) 🛡️

**Secure File Storage System (SFSS)** — A professional-grade, Zero-Knowledge file vault featuring password-derived AES-256-GCM encryption, plausible deniability protocols, and a cloud-synced metadata registry.

![Secura dashboard overview](docs/assets/dashborad%20overview.png)

## ✨ Project Evolution: The "Work Wow" Factor
Secura has evolved from a standard file uploader into a high-security **Privacy Sandbox**. By implementing Zero-Knowledge principles, we ensure that user data is encrypted locally and sensitive keys never leave the browser.

### Core Features
- **Zero-Knowledge Architecture:** Encryption happens entirely in the browser using the W3C Web Crypto API.
- **PBKDF2 Key Derivation:** No more clunky key files. Keys are derived from your personal password using 100,000 iterations of SHA-256 and unique 16-byte salts.
- **Plausible Deniability (Decoy Vault):** Users can set a secondary "Decoy" password to load a fake environment, protecting real data under duress.
- **Metadata Registry Sync:** Local security actions (encryption/decryption) are mirrored to a Django-powered cloud ledger for persistent activity history.
- **Mobile Funnel UI:** A strategic web-to-mobile bridge that previews "Pro" features like Cloud Drive Sync, Inheritance, and Biometric Auth.

## 🏗️ Project Structure
```
server_django/   Django Backend (Metadata Registry, Audit Log, Identity)
web/             React Web Client (Zero-Knowledge Local Sandbox)
src/             React Native Mobile App (The "Sync & Inheritance" Pro Demo)
```

## 🚀 Quick Start (Local Development)

### 1. Backend Registry (Django + MySQL)
```bash
cd server_django
venv\Scripts\activate
python manage.py migrate
python manage.py runserver 0.0.0.0:4000
```
*The backend now acts as a secure identity provider and activity ledger.*

### 2. Web Sandbox (Vite + React)
```bash
cd web
npm install
npm run dev
```
*The Web Client performs all cryptographic operations locally for maximum privacy.*

## 🛡️ Security & Cryptography
Secura follows industry-standard security protocols:
- **Cipher:** AES-256-GCM (Galois/Counter Mode) for authenticated encryption.
- **KDF:** PBKDF2 with 100k iterations to mitigate brute-force attacks.
- **Entropy:** Real-time password strength indicator in the vault interface.

For a deep dive into our security model, see [SECURITY.md](SECURITY.md).

## 📊 Roadmap & Ecosystem
The web app serves as the high-security "Lite" entry point, while the **Secura Mobile App** unlocks the full ecosystem:
- [x] Local Sandbox (Web)
- [x] Metadata Cloud Sync
- [x] Plausible Deniability
- [ ] Cloud Drive Integration (Mobile Pro)
- [ ] Emergency Inheritance Protocol (Mobile Pro)
- [ ] Biometric Secure Enclave (Mobile Pro)

## 📄 License
MIT. See `LICENSE`.
