from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_files),
    path('<uuid:file_id>', views.file_detail),
    path('upload', views.upload_file),
    path('<uuid:file_id>/download', views.download_file)
]
