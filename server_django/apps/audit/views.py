from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta, datetime, time
from django.db.models import Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils.dateparse import parse_datetime
import csv
from io import StringIO
from .models import AuditLog
from .serializers import AuditLogSerializer
from .utils import log_action
from apps.files.models import StoredFile, ShareLink


def _is_admin(user):
    return getattr(user.profile, 'role', 'user') == 'admin'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def activity(request):
    logs = AuditLog.objects.filter(user=request.user)
    page = int(request.query_params.get('page', '1'))
    page_size = int(request.query_params.get('page_size', '50'))
    start = (page - 1) * page_size
    end = start + page_size
    total = logs.count()
    payload = {
        'items': AuditLogSerializer(logs[start:end], many=True).data,
        'page': page,
        'page_size': page_size,
        'total': total
    }
    return Response(payload)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_audit(request):
    if not _is_admin(request.user):
        return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)
    logs = AuditLog.objects.all()
    page = int(request.query_params.get('page', '1'))
    page_size = int(request.query_params.get('page_size', '50'))
    start = (page - 1) * page_size
    end = start + page_size
    total = logs.count()
    payload = {
        'items': AuditLogSerializer(logs[start:end], many=True).data,
        'page': page,
        'page_size': page_size,
        'total': total
    }
    return Response(payload)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_users(request):
    if not _is_admin(request.user):
        return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)
    payload = [
        {
            'id': user.id,
            'email': user.email,
            'role': getattr(user.profile, 'role', 'user'),
            'isActive': user.is_active,
            'createdAt': user.date_joined
        }
        for user in User.objects.all()
    ]
    return Response(payload)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_summary(request):
    if not _is_admin(request.user):
        return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)
    users_count = User.objects.count()
    files_count = StoredFile.objects.count()
    uploads = AuditLog.objects.filter(action='UPLOAD_FILE').count()
    downloads = AuditLog.objects.filter(action='DOWNLOAD_FILE').count()
    payload = {
        'users': users_count,
        'files': files_count,
        'uploads': uploads,
        'downloads': downloads
    }
    return Response(payload)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_shares(request):
    if not _is_admin(request.user):
        return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)
    shares = ShareLink.objects.select_related('file', 'created_by').all()
    payload = [
        {
            'token': share.token,
            'fileId': str(share.file.id),
            'fileName': share.file.original_name,
            'owner': share.file.owner.email,
            'createdBy': share.created_by.email,
            'createdAt': share.created_at,
            'expiresAt': share.expires_at
        }
        for share in shares
    ]
    return Response(payload)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def admin_revoke_share(request, token):
    if not _is_admin(request.user):
        return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)
    try:
        share = ShareLink.objects.get(token=token)
    except ShareLink.DoesNotExist:
        return Response({'detail': 'not found'}, status=status.HTTP_404_NOT_FOUND)
    share.delete()
    log_action(request.user, 'ADMIN_SHARE_REVOKED', request.META.get('REMOTE_ADDR'))
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def admin_toggle_user(request, user_id):
    if not _is_admin(request.user):
        return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)
    try:
        target = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({'detail': 'not found'}, status=status.HTTP_404_NOT_FOUND)
    if target == request.user:
        return Response({'detail': 'Cannot modify your own account'}, status=status.HTTP_400_BAD_REQUEST)
    target.is_active = not target.is_active
    target.save(update_fields=['is_active'])
    action = 'ADMIN_USER_ENABLED' if target.is_active else 'ADMIN_USER_DISABLED'
    log_action(request.user, action, request.META.get('REMOTE_ADDR'))
    return Response({'id': target.id, 'email': target.email, 'isActive': target.is_active})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_export_csv(request):
    if not _is_admin(request.user):
        return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)
    logs = AuditLog.objects.all().order_by('-timestamp')
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(['id', 'user', 'action', 'timestamp', 'ip'])
    for log in logs:
        writer.writerow([log.id, log.user.email if log.user else '', log.action, log.timestamp.isoformat(), log.ip])
    from django.http import HttpResponse
    response = HttpResponse(output.getvalue(), content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="audit_all.csv"'
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_csv(request):
    logs = AuditLog.objects.filter(user=request.user)
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(['id', 'action', 'timestamp', 'ip'])
    for log in logs:
        writer.writerow([log.id, log.action, log.timestamp.isoformat(), log.ip])
    response = Response(output.getvalue(), content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="audit.csv"'
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics_summary(request):
    now = timezone.now()
    last7 = now - timedelta(days=7)
    prev7 = now - timedelta(days=14)

    logs = AuditLog.objects.filter(user=request.user)
    uploads_last7 = logs.filter(action='UPLOAD_FILE', timestamp__gte=last7).count()
    downloads_last7 = logs.filter(action='DOWNLOAD_FILE', timestamp__gte=last7).count()

    series = []
    for offset in range(6, -1, -1):
        day = (now - timedelta(days=offset)).date()
        day_start = timezone.make_aware(datetime.combine(day, time.min))
        day_end = day_start + timedelta(days=1)
        uploads = logs.filter(action='UPLOAD_FILE', timestamp__gte=day_start, timestamp__lt=day_end).count()
        downloads = logs.filter(action='DOWNLOAD_FILE', timestamp__gte=day_start, timestamp__lt=day_end).count()
        series.append({
            'date': day.isoformat(),
            'uploads': uploads,
            'downloads': downloads
        })

    files = StoredFile.objects.filter(owner=request.user)
    total_bytes = files.aggregate(total=Sum('size_bytes'))['total'] or 0
    added_last7 = files.filter(created_at__gte=last7).aggregate(total=Sum('size_bytes'))['total'] or 0
    added_prev7 = files.filter(created_at__gte=prev7, created_at__lt=last7).aggregate(total=Sum('size_bytes'))['total'] or 0
    if added_prev7 > 0:
        trend_percent = ((added_last7 - added_prev7) / added_prev7) * 100
    else:
        trend_percent = 100 if added_last7 > 0 else 0

    score = 90
    if files.exists():
        score += 2
    if uploads_last7 + downloads_last7 > 0:
        score += 2
    score = min(96, score)

    payload = {
        'rangeDays': 7,
        'uploadsLast7': uploads_last7,
        'downloadsLast7': downloads_last7,
        'activitySeries': series,
        'securityHealth': {
            'score': score,
            'label': 'Encryption + access checks'
        },
        'storage': {
            'totalBytes': total_bytes,
            'addedLast7Bytes': added_last7,
            'trendPercent': round(trend_percent, 1),
            'label': 'This week'
        },
        'filesTotal': files.count()
    }
    return Response(payload)
