from .models import AuditLog


def log_action(user, action, ip):
    AuditLog.objects.create(user=user, action=action, ip=ip or '')
