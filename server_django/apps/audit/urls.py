from django.urls import path
from . import views

urlpatterns = [
    path('', views.activity),
    path('export', views.export_csv)
]
