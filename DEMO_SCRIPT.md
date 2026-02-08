# Secura MVP Demo Script

## Goal
Show a secure file storage workflow with encryption, RBAC, and audit logging.

## Setup
- Backend running on `http://localhost:4000`
- Web app running on `http://localhost:5173`
- Seeded accounts:
  - Admin: `admin@secura.local` / `<ADMIN_PASSWORD>`
  - User: `user@secura.local` / `<USER_PASSWORD>`

## Demo Flow (5–7 minutes)

1. **Intro (30s)**
   - “Secura is a secure file vault. Files are encrypted before storage and access is logged.”
   - Show splash and hero screen.

2. **Login (30s)**
   - Open Account tab.
   - Login as **User**.

3. **Upload + Encryption (1m)**
   - Upload a file.
   - Point to encryption progress bar and “Encrypting” label.
   - Confirm file appears in the list and recent section.

4. **Download + Decryption (45s)**
   - Click download.
   - Explain decryption happens on access, never stored decrypted.

5. **Search + Filter (30s)**
   - Search for a file.
   - Sort by size or name.

6. **Audit Trail (45s)**
   - Go to Activity tab.
   - Show upload/download entries with timestamps.

7. **Admin Oversight (1m)**
   - Logout and login as **Admin**.
   - Open Admin tab: show users + audit logs.
   - Explain RBAC: admin can see system logs; user cannot.

8. **Wrap (30s)**
   - “Core goals achieved: encryption, RBAC, audit, secure access.”
   - Mention future work: versioning, cloud storage, 2FA.

## Optional Notes
- If analytics panel shows data, point out it’s computed from real activity.
- If demo data is empty, run seed script again before presenting.
