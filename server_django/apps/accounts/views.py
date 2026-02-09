from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.cache import cache
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth.models import User
from .serializers import RegisterSerializer, ProfileSerializer
from apps.audit.utils import log_action


def _rate_limit(key, limit, window_seconds):
    count = cache.get(key, 0)
    if count >= limit:
        return False
    if count == 0:
        cache.set(key, 1, timeout=window_seconds)
    else:
        cache.incr(key)
    return True


@api_view(['POST'])
def register(request):
    ip = request.META.get('REMOTE_ADDR') or 'unknown'
    if not _rate_limit(f"register:{ip}", 8, 60):
        return Response({'detail': 'Too many requests. Try again soon.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        log_action(user, 'REGISTER', request.META.get('REMOTE_ADDR'))
        return Response(
            {
                'token': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {'email': user.email, 'role': getattr(user.profile, 'role', 'user')}
            },
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def login(request):
    ip = request.META.get('REMOTE_ADDR') or 'unknown'
    if not _rate_limit(f"login:{ip}", 12, 60):
        return Response({'detail': 'Too many requests. Try again soon.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    email = (request.data.get('email') or '').strip().lower()
    password = request.data.get('password') or ''
    user = User.objects.filter(username=email).first()
    if user and user.profile.lock_until and user.profile.lock_until > timezone.now():
        remaining = int((user.profile.lock_until - timezone.now()).total_seconds() // 60) + 1
        return Response({'detail': f'Account locked. Try again in {remaining} min.'}, status=status.HTTP_423_LOCKED)
    user = authenticate(username=email, password=password)
    if not user:
        if user is None:
            existing = User.objects.filter(username=email).first()
            if existing:
                profile = existing.profile
                profile.failed_attempts += 1
                if profile.failed_attempts >= 5:
                    profile.lock_until = timezone.now() + timedelta(minutes=15)
                    profile.failed_attempts = 0
                profile.save()
        return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    refresh = RefreshToken.for_user(user)
    user.profile.failed_attempts = 0
    user.profile.lock_until = None
    user.profile.save()
    log_action(user, 'LOGIN', request.META.get('REMOTE_ADDR'))
    return Response(
        {
            'token': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {'email': user.email, 'role': getattr(user.profile, 'role', 'user')}
        }
    )


@api_view(['POST'])
def guest(request):
    return Response(
        {'token': 'offline-guest', 'user': {'email': 'guest@offline', 'role': 'guest'}},
        status=status.HTTP_200_OK
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    user = request.user
    role = getattr(user.profile, 'role', 'user')
    serializer = ProfileSerializer({'email': user.email, 'role': role})
    return Response(serializer.data)
