from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_files),
    path('<uuid:file_id>', views.file_detail),
    path('upload', views.upload_file),
    path('<uuid:file_id>/download', views.download_file),
    path('<uuid:file_id>/share', views.create_share),
    path('<uuid:file_id>/shares', views.list_shares),
    path('share/<str:token>/revoke', views.revoke_share),
    path('share/<str:token>', views.download_share)
]
