# Python Backend + MySQL Guide for Secura

This guide shows how to run the backend using Python (Flask or Django) with MySQL, and how to connect the existing React Native app.

## Overview

You can absolutely use Python for the backend and MySQL for the database. The mobile app will call HTTP APIs the same way it does now.

You have two options:

- Flask (lighter, faster to set up)
- Django (batteries‑included, admin panel, ORM)

If you want a fast MVP, choose Flask. If you want an admin UI and stronger structure, choose Django.

## Option A: Flask + MySQL (Recommended for MVP)

### 1. Create virtual environment

```bash
python -m venv .venv
. .venv/Scripts/activate
```

### 2. Install dependencies

```bash
pip install flask flask-sqlalchemy flask-migrate flask-jwt-extended pymysql python-dotenv cryptography
```

### 3. Project structure (new folder)

```
server_py/
  app.py
  config.py
  models.py
  routes/
    auth.py
    files.py
    activity.py
    admin.py
  services/
    crypto.py
    storage.py
  migrations/
```

### 4. MySQL config

Create `server_py/.env`:

```
DATABASE_URL=mysql+pymysql://USER:PASSWORD@HOST:3306/secura
JWT_SECRET=change_me
STORAGE_DIR=./storage
```

### 5. Basic Flask app

`server_py/app.py`

```python
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os

load_dotenv()

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET')

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    from routes.auth import auth_bp
    from routes.files import files_bp
    from routes.activity import activity_bp
    from routes.admin import admin_bp

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(files_bp, url_prefix='/files')
    app.register_blueprint(activity_bp, url_prefix='/activity')
    app.register_blueprint(admin_bp, url_prefix='/admin')

    return app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=4000, debug=True)
```

### 6. Database models (example)

`server_py/models.py`

```python
from datetime import datetime
from app import db

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(32), default='user')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class File(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    original_name = db.Column(db.String(255))
    storage_path = db.Column(db.String(512))
    size_bytes = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AuditLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer)
    action = db.Column(db.String(128))
    ip = db.Column(db.String(64))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
```

### 7. Encryption service

`server_py/services/crypto.py`

```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os

KEY = os.environ.get('AES_KEY')
if not KEY:
    KEY = os.urandom(32)


def encrypt_bytes(raw: bytes) -> bytes:
    nonce = os.urandom(12)
    aesgcm = AESGCM(KEY)
    cipher = aesgcm.encrypt(nonce, raw, None)
    return nonce + cipher


def decrypt_bytes(payload: bytes) -> bytes:
    nonce = payload[:12]
    cipher = payload[12:]
    aesgcm = AESGCM(KEY)
    return aesgcm.decrypt(nonce, cipher, None)
```

### 8. Migrations

```bash
flask db init
flask db migrate -m "init"
flask db upgrade
```

### 9. Connect app

Update API base in `src/api/client.js`:

```js
const API_BASE = "http://<your-ip>:4000";
```

## Option B: Django + MySQL

### 1. Setup

```bash
python -m venv .venv
. .venv/Scripts/activate
pip install django djangorestframework mysqlclient python-dotenv cryptography
```

### 2. Create project

```bash
django-admin startproject secura_api
cd secura_api
python manage.py startapp files
```

### 3. MySQL settings

In `secura_api/settings.py`:

```python
DATABASES = {
  'default': {
    'ENGINE': 'django.db.backends.mysql',
    'NAME': 'secura',
    'USER': 'USER',
    'PASSWORD': 'PASSWORD',
    'HOST': '127.0.0.1',
    'PORT': '3306',
  }
}
```

### 4. API endpoints

Use Django REST Framework to build:

- `POST /auth/register`
- `POST /auth/login`
- `GET /files`
- `POST /files/upload`
- `GET /files/{id}/download`
- `GET /activity`
- `GET /admin/users`
- `GET /admin/audit`

## Can this become multi‑platform?

Yes. This project can support:

- Mobile app (React Native)
- Web app (React web)
- Desktop (optional via Electron or Tauri)

Recommended approach:

- Keep API as a standalone service
- Build a separate React web client that reuses UI tokens and API calls
- Reuse encryption rules on the backend so all platforms stay consistent

## If you want me to start now

I can:

1. Create `server_py/` Flask backend with MySQL, JWT auth, and AES‑256 encryption.
2. Wire the existing React Native app to the new Python API.
3. Add minimal seed users and demo file uploads.

Reply with:

- `Flask` or `Django`
- MySQL credentials (host/user/db name, no passwords if you prefer .env)
- Whether to keep or delete the existing Node backend
