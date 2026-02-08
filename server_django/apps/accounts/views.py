from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from .serializers import RegisterSerializer, ProfileSerializer
from apps.audit.utils import log_action


@api_view(['POST'])
def register(request):
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
    email = (request.data.get('email') or '').strip().lower()
    password = request.data.get('password') or ''
    user = authenticate(username=email, password=password)
    if not user:
        return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    refresh = RefreshToken.for_user(user)
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
