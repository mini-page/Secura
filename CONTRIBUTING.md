# Contributing

Thanks for helping improve Secura.

## Setup
- Backend: `server_django/` (Python + Django)
- Web: `web/` (Vite + React)
- Mobile demo: `src/` (React Native)

## Guidelines
- Keep changes scoped and documented.
- Add/adjust tests if behavior changes.
- Use clear commit messages.

## Common Tasks
```bash
# Backend
cd server_django
venv\Scripts\python manage.py migrate
venv\Scripts\python manage.py runserver 0.0.0.0:4000

# Web
cd web
npm install
npm run dev
```

## Reporting Issues
Include:
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/logs if relevant
