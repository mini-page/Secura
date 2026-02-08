# Secura Deployment Checklist (Vercel + Railway)

## 1) Railway (Backend)

1. Create Railway project and connect GitHub repo.
2. Set **Root Directory** to `server_django`.
3. Add MySQL plugin or external MySQL.
4. Add environment variables:
   - `DJANGO_SECRET_KEY`
   - `DEBUG=0`
   - `ALLOWED_HOSTS=<your-railway-domain>`
   - `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
   - `AES_KEY_BASE64` (keep stable)
   - `STORAGE_DIR=/data/storage`
5. Add a persistent volume mounted at `/data`.
6. Run migrations:
   - `python manage.py migrate`
7. Seed demo accounts (optional):
   - `python scripts/seed.py`
8. Confirm API endpoints:
   - `/auth/login`, `/files`, `/analytics/summary`

## 2) Vercel (Frontend)

1. Create Vercel project and connect GitHub repo.
2. Set **Root Directory** to `web`.
3. Framework preset: **Vite**.
4. Build command: `npm run build`
5. Output directory: `dist`
6. Update `web/vercel.json`:
   - Replace `https://YOUR-RAILWAY-APP.up.railway.app` with your Railway URL.
7. Deploy.

## 3) Post‑Deploy Checks

- Login works
- Upload encrypts and stores
- Download works
- Activity logs update
- Admin logs visible
- Analytics panel shows real data

## 4) Common Issues

- **CORS**: Use Vercel rewrite `/api/*` → Railway.
- **Files lost on deploy**: Add Railway volume and use `STORAGE_DIR=/data/storage`.
- **Build errors on Windows**: Run `npm run build` as admin or allow `esbuild` in antivirus.
