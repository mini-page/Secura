from django.urls import path
from . import views

urlpatterns = [
    path('users', views.admin_users),
    path('users/<int:user_id>', views.admin_toggle_user),
    path('audit', views.admin_audit),
    path('audit/export', views.admin_export_csv),
    path('summary', views.admin_summary),
    path('shares', views.admin_shares),
    path('shares/<str:token>', views.admin_revoke_share),
]
