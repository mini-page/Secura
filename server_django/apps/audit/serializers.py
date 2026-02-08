from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField()
    timestamp = serializers.DateTimeField()

    class Meta:
        model = AuditLog
        fields = ('id', 'action', 'timestamp', 'ip')
