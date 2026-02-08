from django.contrib.auth.models import User
from rest_framework import serializers


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ('email', 'password')

    def create(self, validated_data):
        email = validated_data['email'].strip().lower()
        user = User.objects.create_user(username=email, email=email, password=validated_data['password'])
        return user


class ProfileSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.CharField()
