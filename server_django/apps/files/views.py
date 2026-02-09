import os
import hashlib
import secrets
from uuid import uuid4
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from django.http import HttpResponse, Http404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import StoredFile, ShareLink
from .serializers import StoredFileSerializer
import mimetypes
from .crypto import encrypt_bytes, decrypt_bytes
from apps.audit.utils import log_action


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_files(request):
    files = StoredFile.objects.filter(owner=request.user)
    page = int(request.query_params.get('page', '1'))
    page_size = int(request.query_params.get('page_size', '50'))
    start = (page - 1) * page_size
    end = start + page_size
    total = files.count()
    payload = {
        'items': StoredFileSerializer(files[start:end], many=True).data,
        'page': page,
        'page_size': page_size,
        'total': total
    }
    return Response(payload)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def file_detail(request, file_id):
    try:
        record = StoredFile.objects.get(id=file_id, owner=request.user)
    except StoredFile.DoesNotExist as exc:
        raise Http404 from exc
    mime_type, _ = mimetypes.guess_type(record.original_name)
    payload = StoredFileSerializer(record).data
    payload['mimeType'] = mime_type or 'application/octet-stream'
    return Response(payload)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_file(request):
    if 'file' not in request.FILES:
        return Response({'detail': 'file is required'}, status=status.HTTP_400_BAD_REQUEST)
    uploaded = request.FILES['file']
    raw = uploaded.read()
    checksum = hashlib.sha256(raw).hexdigest()
    encrypted = encrypt_bytes(raw)

    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    existing = StoredFile.objects.filter(owner=request.user, original_name=uploaded.name).order_by('-version').first()
    logical_id = existing.logical_id if existing else uuid4()
    version = (existing.version + 1) if existing else 1
    file_id = uuid4()
    storage_name = f"{file_id}.bin"
    storage_path = os.path.join(settings.STORAGE_DIR, storage_name)

    with open(storage_path, 'wb') as handle:
        handle.write(encrypted)

    record = StoredFile.objects.create(
        id=file_id,
        logical_id=logical_id,
        owner=request.user,
        original_name=uploaded.name,
        storage_path=storage_path,
        size_bytes=len(raw),
        version=version,
        checksum=checksum
    )
    log_action(request.user, 'UPLOAD_FILE', request.META.get('REMOTE_ADDR'))
    return Response(StoredFileSerializer(record).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_file(request, file_id):
    try:
        record = StoredFile.objects.get(id=file_id, owner=request.user)
    except StoredFile.DoesNotExist as exc:
        raise Http404 from exc

    if not os.path.exists(record.storage_path):
        raise Http404

    with open(record.storage_path, 'rb') as handle:
        payload = handle.read()

    raw = decrypt_bytes(payload)
    digest = hashlib.sha256(raw).hexdigest()
    if record.checksum and digest != record.checksum:
        return Response({'detail': 'file integrity check failed'}, status=status.HTTP_409_CONFLICT)
    log_action(request.user, 'DOWNLOAD_FILE', request.META.get('REMOTE_ADDR'))
    response = HttpResponse(raw, content_type='application/octet-stream')
    response['Content-Disposition'] = f'attachment; filename=\"{record.original_name}\"'
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_share(request, file_id):
    try:
        record = StoredFile.objects.get(id=file_id, owner=request.user)
    except StoredFile.DoesNotExist as exc:
        raise Http404 from exc
    minutes = int(request.data.get('expires_minutes') or 1440)
    token = secrets.token_urlsafe(24)
    expires_at = timezone.now() + timedelta(minutes=minutes) if minutes > 0 else None
    ShareLink.objects.create(
        token=token,
        file=record,
        created_by=request.user,
        expires_at=expires_at
    )
    log_action(request.user, 'SHARE_CREATED', request.META.get('REMOTE_ADDR'))
    return Response({'token': token, 'shareUrl': f"/files/share/{token}", 'expiresAt': expires_at})


@api_view(['GET'])
def download_share(request, token):
    try:
        share = ShareLink.objects.select_related('file').get(token=token)
    except ShareLink.DoesNotExist as exc:
        raise Http404 from exc
    if share.expires_at and share.expires_at < timezone.now():
        return Response({'detail': 'share link expired'}, status=status.HTTP_410_GONE)
    record = share.file
    if not os.path.exists(record.storage_path):
        raise Http404
    with open(record.storage_path, 'rb') as handle:
        payload = handle.read()
    raw = decrypt_bytes(payload)
    digest = hashlib.sha256(raw).hexdigest()
    if record.checksum and digest != record.checksum:
        return Response({'detail': 'file integrity check failed'}, status=status.HTTP_409_CONFLICT)
    log_action(record.owner, 'SHARE_DOWNLOADED', request.META.get('REMOTE_ADDR'))
    response = HttpResponse(raw, content_type='application/octet-stream')
    response['Content-Disposition'] = f'attachment; filename=\"{record.original_name}\"'
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_shares(request, file_id):
    try:
        record = StoredFile.objects.get(id=file_id, owner=request.user)
    except StoredFile.DoesNotExist as exc:
        raise Http404 from exc
    shares = ShareLink.objects.filter(file=record)
    payload = [
        {
            'token': share.token,
            'expiresAt': share.expires_at,
            'createdAt': share.created_at
        }
        for share in shares
    ]
    return Response(payload)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def revoke_share(request, token):
    try:
        share = ShareLink.objects.select_related('file').get(token=token)
    except ShareLink.DoesNotExist as exc:
        raise Http404 from exc
    if share.file.owner != request.user:
        return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)
    share.delete()
    log_action(request.user, 'SHARE_REVOKED', request.META.get('REMOTE_ADDR'))
    return Response(status=status.HTTP_204_NO_CONTENT)
