from rest_framework import serializers
from .models import StoredFile


class StoredFileSerializer(serializers.ModelSerializer):
    fileId = serializers.UUIDField(source='id')
    originalName = serializers.CharField(source='original_name')
    sizeBytes = serializers.IntegerField(source='size_bytes')
    createdAt = serializers.DateTimeField(source='created_at')

    class Meta:
        model = StoredFile
        fields = ('fileId', 'originalName', 'sizeBytes', 'createdAt')
