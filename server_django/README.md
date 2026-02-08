# Secura Django Backend (MySQL)

This is the new Django backend scaffold for Secura. It lives alongside the existing Node backend for clarity while you migrate.

## Why Django

- Fast to ship with strong defaults
- Secure auth patterns
- Admin panel for audit + user management

## Quick Start (local dev)

1. Create and activate virtual env

```bash
python -m venv .venv
. .venv/Scripts/activate
```

2. Install dependencies

```bash
pip install -r requirements.txt
```

3. Create `.env`

Copy `.env.example` to `.env` and set MySQL credentials and `DJANGO_SECRET_KEY`.

4. Run migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

5. Create admin user (optional)

```bash
python manage.py createsuperuser
```

6. Start server

```bash
python manage.py runserver 0.0.0.0:4000
```

### One‑shot setup script (Windows PowerShell)

```bash
./scripts/setup.ps1
```

Seeds can be customized in `.env`:

- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_USER_EMAIL`
- `SEED_USER_PASSWORD`

If these are left empty, random passwords are generated and printed when seeding.

### Migrate from old Node backend (users + audit logs)

```bash
python ./scripts/migrate_from_node.py
```

Note: files are not migrated because encryption formats differ. Re‑upload is required.

## API Endpoints (matches app)

- `POST /auth/register`
- `POST /auth/login` (JWT)
- `POST /auth/refresh`
- `GET /auth/me`
- `GET /files`
- `POST /files/upload`
- `GET /files/<id>/download`
- `GET /activity`
- `GET /admin-api/users`
- `GET /admin-api/audit`

## AES Key (important)

Set `AES_KEY_BASE64` in `.env` to a 32‑byte key encoded in base64.
If it is empty, the server generates a temporary key (dev‑only). This will break decryption after restart.

Generate a key:

```bash
python -c "import os,base64; print(base64.b64encode(os.urandom(32)).decode())"
```

## Node backend

The existing Node backend remains in `server/` for now so you can compare behavior. Once Django is stable, we can remove `server/`.

## Multi‑platform support

Yes — you can serve mobile and web from the same API.

Recommended:

- Keep API as standalone service
- Create a React web client that shares the same API helpers
- Optionally add a desktop client later (Electron/Tauri)
