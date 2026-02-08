from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('auth/', include('apps.accounts.urls')),
    path('files/', include('apps.files.urls')),
    path('activity/', include('apps.audit.urls')),
    path('analytics/', include('apps.audit.analytics_urls')),
    path('admin-api/', include('apps.audit.admin_urls')),
]
