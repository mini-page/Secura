# Secura Backend & Metadata Registry Guide

This guide documents the Secura Django Backend, which serves as a secure **Metadata Registry**, **Identity Provider**, and **Audit Ledger** for the Secura ecosystem.

## 🏗️ Architectural Overview (Zero-Knowledge)
In the Secura ecosystem, the backend operates under a **Zero-Knowledge** model for the web client:
1.  **Web Sandbox:** The React client performs all encryption locally using PBKDF2 + AES-GCM.
2.  **Metadata Registry:** After local encryption, the web client sends a metadata packet (Filename, Size, Checksum) to the Django backend.
3.  **Audit Ledger:** The backend logs the event but never sees the plaintext file or the encryption password.

## 🚀 Key Endpoints

### Authentication
- `POST /api/auth/register`: Create a new Secura account.
- `POST /api/auth/login`: Authenticate and receive a JWT token.
- `POST /api/auth/google`: OAuth2 integration for seamless login.

### Files & Metadata
- `POST /api/files/register-metadata`: **(New)** Registry for local-only security actions.
  - *Payload:* `{ "original_name": "vault.pdf", "size_bytes": 1024, "checksum": "sha256..." }`
- `GET /api/files/`: List the user's registry (includes both `LOCAL_ONLY` and `CLOUD` files).
- `DELETE /api/files/{id}`: Revoke a file from the registry.

### Audit & Security
- `GET /api/audit/`: Fetch security activity logs (Login, Local Encryption, Registry Revocation).

## 🛡️ Security Hardening
- **JWT Authentication:** All API routes are protected by JSON Web Tokens.
- **Role-Based Access Control (RBAC):** Distinction between standard Users and Administrators.
- **Checksum Integrity:** The registry stores SHA-256 hashes to ensure file integrity during local restoration.

## 🛠️ Local Development (Django)
1.  **Venv Setup:** `python -m venv venv`
2.  **Activate:** `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Mac/Linux)
3.  **Install:** `pip install -r requirements.txt`
4.  **Database:** Ensure MySQL is running, then `python manage.py migrate`
5.  **Run:** `python manage.py runserver`

## 📊 Database Schema
The primary model is `StoredFile`:
- `status`: Enumeration (`LOCAL_ONLY`, `CLOUD`).
- `checksum`: SHA-256 hash for integrity validation.
- `owner`: Foreign Key to the User model.
- `storage_path`: Nullable for local-only metadata tracking.
