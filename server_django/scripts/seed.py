import os
import secrets
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'secura_api.settings')

django.setup()

from django.contrib.auth.models import User
from django.conf import settings
from apps.accounts.models import Profile
from apps.files.models import StoredFile
from apps.files.crypto import encrypt_bytes
from uuid import uuid4
import os
import hashlib

ADMIN_EMAIL = os.getenv('SEED_ADMIN_EMAIL') or 'admin@secura.local'
ADMIN_PASSWORD = os.getenv('SEED_ADMIN_PASSWORD') or ''
USER_EMAIL = os.getenv('SEED_USER_EMAIL') or 'user@secura.local'
USER_PASSWORD = os.getenv('SEED_USER_PASSWORD') or ''
SEED_SAMPLE_FILES = (os.getenv('SEED_SAMPLE_FILES') or '1') == '1'


def ensure_user(email, password, role='user'):
    email = email.strip().lower()
    user, created = User.objects.get_or_create(username=email, defaults={'email': email})
    if not password:
        password = secrets.token_urlsafe(12)
    user.email = email
    user.set_password(password)
    user.save()
    profile, _ = Profile.objects.get_or_create(user=user)
    profile.role = role
    profile.save()
    return user, password


def seed_files_for_user(user, count=2):
    if StoredFile.objects.filter(owner=user).exists():
        return
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    samples = [
        ("Welcome_to_Secura.txt", b"Welcome to Secura. Your files are encrypted at rest."),
        ("Project_Readme.txt", b"Secure File Storage System demo file."),
        ("Audit_Policy.txt", b"Access is logged. Only authorized users can decrypt files.")
    ]
    for name, raw in samples[:count]:
        file_id = uuid4()
        logical_id = uuid4()
        checksum = hashlib.sha256(raw).hexdigest()
        storage_name = f"{file_id}.bin"
        storage_path = os.path.join(settings.STORAGE_DIR, storage_name)
        encrypted = encrypt_bytes(raw)
        with open(storage_path, 'wb') as handle:
            handle.write(encrypted)
        StoredFile.objects.create(
            id=file_id,
            logical_id=logical_id,
            owner=user,
            original_name=name,
            storage_path=storage_path,
            size_bytes=len(raw),
            version=1,
            checksum=checksum
        )


def main():
    admin_user, admin_password = ensure_user(ADMIN_EMAIL, ADMIN_PASSWORD, role='admin')
    demo_user, demo_password = ensure_user(USER_EMAIL, USER_PASSWORD, role='user')
    if SEED_SAMPLE_FILES:
        seed_files_for_user(admin_user, count=2)
        seed_files_for_user(demo_user, count=3)
    print('Seed complete')
    print(f'Admin: {admin_user.email} / {admin_password}')
    print(f'User: {demo_user.email} / {demo_password}')


if __name__ == '__main__':
    main()
