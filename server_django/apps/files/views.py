import os
from uuid import uuid4
from django.conf import settings
from django.http import HttpResponse, Http404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import StoredFile
from .serializers import StoredFileSerializer
import mimetypes
from .crypto import encrypt_bytes, decrypt_bytes
from apps.audit.utils import log_action


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_files(request):
    files = StoredFile.objects.filter(owner=request.user)
    return Response(StoredFileSerializer(files, many=True).data)


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
    encrypted = encrypt_bytes(raw)

    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    file_id = uuid4()
    storage_name = f"{file_id}.bin"
    storage_path = os.path.join(settings.STORAGE_DIR, storage_name)

    with open(storage_path, 'wb') as handle:
        handle.write(encrypted)

    record = StoredFile.objects.create(
        id=file_id,
        owner=request.user,
        original_name=uploaded.name,
        storage_path=storage_path,
        size_bytes=len(raw)
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
    log_action(request.user, 'DOWNLOAD_FILE', request.META.get('REMOTE_ADDR'))
    response = HttpResponse(raw, content_type='application/octet-stream')
    response['Content-Disposition'] = f'attachment; filename=\"{record.original_name}\"'
    return response
