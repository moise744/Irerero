from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("sms-log", views.SmsLogViewSet, basename="sms-log")

urlpatterns = [
    path("", include(router.urls)),
    path("sms/batch/", views.BatchSmsView.as_view(), name="sms-batch"),
]
