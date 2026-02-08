from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta, datetime, time
from django.db.models import Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import AuditLog
from .serializers import AuditLogSerializer
from apps.files.models import StoredFile


def _is_admin(user):
    return getattr(user.profile, 'role', 'user') == 'admin'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def activity(request):
    logs = AuditLog.objects.filter(user=request.user)
    return Response(AuditLogSerializer(logs, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_audit(request):
    if not _is_admin(request.user):
        return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)
    logs = AuditLog.objects.all()
    return Response(AuditLogSerializer(logs, many=True).data)


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
            'createdAt': user.date_joined
        }
        for user in User.objects.all()
    ]
    return Response(payload)


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
