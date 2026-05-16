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
from django.conf import settings
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
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
def google_auth(request):
    token = request.data.get('credential')
    if not token:
        return Response({'detail': 'Google credential required'}, status=status.HTTP_400_BAD_REQUEST)
    
    client_id = getattr(settings, 'GOOGLE_CLIENT_ID', None)
    if not client_id:
        return Response({'detail': 'Google Auth not configured on server'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')
        
        email = idinfo['email'].lower()
        # Get or create user
        user, created = User.objects.get_or_create(username=email, defaults={'email': email})
        if created:
            user.set_unusable_password()
            user.save()
            log_action(user, 'GOOGLE_REGISTER', request.META.get('REMOTE_ADDR'))
        else:
            log_action(user, 'GOOGLE_LOGIN', request.META.get('REMOTE_ADDR'))

        refresh = RefreshToken.for_user(user)
        return Response({
            'token': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {'email': user.email, 'role': getattr(user.profile, 'role', 'user')}
        })
    except ValueError as e:
        return Response({'detail': f'Invalid token: {str(e)}'}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({'detail': f'Google Auth Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    current = request.data.get('current_password') or ''
    new_pw = request.data.get('new_password') or ''
    if not current or not new_pw:
        return Response({'detail': 'current_password and new_password are required.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(new_pw) < 8:
        return Response({'detail': 'New password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)
    if not user.check_password(current):
        return Response({'detail': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
    user.set_password(new_pw)
    user.save()
    log_action(user, 'PASSWORD_CHANGED', request.META.get('REMOTE_ADDR'))
    return Response({'detail': 'Password updated successfully.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    user = request.user
    role = getattr(user.profile, 'role', 'user')
    serializer = ProfileSerializer({'email': user.email, 'role': role})
    return Response(serializer.data)
