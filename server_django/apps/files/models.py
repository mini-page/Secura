import uuid
from django.db import models
from django.contrib.auth.models import User


class StoredFile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    logical_id = models.UUIDField(default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    original_name = models.CharField(max_length=255)
    storage_path = models.CharField(max_length=512)
    size_bytes = models.BigIntegerField(default=0)
    version = models.PositiveIntegerField(default=1)
    checksum = models.CharField(max_length=64, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class ShareLink(models.Model):
    token = models.CharField(max_length=128, unique=True)
    file = models.ForeignKey(StoredFile, on_delete=models.CASCADE, related_name='shares')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
