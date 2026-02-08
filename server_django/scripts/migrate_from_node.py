import os
import sqlite3
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'secura_api.settings')

django.setup()

from django.contrib.auth.models import User
from apps.accounts.models import Profile
from apps.audit.models import AuditLog
from django.utils.dateparse import parse_datetime

SQLITE_PATH = os.getenv('NODE_SQLITE_PATH', os.path.join('..', 'server_node', 'data', 'sfss.db'))


def main():
    sqlite_path = os.path.abspath(SQLITE_PATH)
    if not os.path.exists(sqlite_path):
        print(f'SQLite DB not found: {sqlite_path}')
        print('Skipping migration. No Node data found.')
        return

    conn = sqlite3.connect(sqlite_path)
    conn.row_factory = sqlite3.Row

    users = conn.execute('SELECT * FROM users').fetchall()
    user_map = {}
    for row in users:
        email = row['email'].strip().lower()
        user, created = User.objects.get_or_create(username=email, defaults={'email': email})
        if created:
            user.set_unusable_password()
            user.save()
        profile, _ = Profile.objects.get_or_create(user=user)
        profile.role = row['role']
        profile.save()
        user_map[row['user_id']] = user

    logs = conn.execute('SELECT * FROM audit_logs').fetchall()
    for row in logs:
        parsed = parse_datetime(row['timestamp'])
        user = user_map.get(row['user_id'])
        AuditLog.objects.create(
            user=user,
            action=row['action'],
            ip=row['ip_address'],
            timestamp=parsed or row['timestamp']
        )

    conn.close()
    print(f'Imported users: {len(users)}')
    print(f'Imported audit logs: {len(logs)}')
    print('Files are not migrated because encryption formats differ. Re-upload is required.')


if __name__ == '__main__':
    main()
