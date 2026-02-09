from django.urls import path
from . import views

urlpatterns = [
    path('users', views.admin_users),
    path('audit', views.admin_audit),
    path('summary', views.admin_summary),
    path('shares', views.admin_shares)
]
