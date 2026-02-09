from rest_framework import serializers
from .models import StoredFile


class StoredFileSerializer(serializers.ModelSerializer):
    fileId = serializers.UUIDField(source='id')
    logicalId = serializers.UUIDField(source='logical_id')
    originalName = serializers.CharField(source='original_name')
    sizeBytes = serializers.IntegerField(source='size_bytes')
    version = serializers.IntegerField()
    createdAt = serializers.DateTimeField(source='created_at')

    class Meta:
        model = StoredFile
        fields = ('fileId', 'logicalId', 'originalName', 'sizeBytes', 'version', 'createdAt')
