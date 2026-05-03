from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.AttendanceViewSet, basename="attendance")

urlpatterns = [
    path("", include(router.urls)),
    path("<uuid:child_id>/rate/", views.AttendanceRateView.as_view(), name="attendance-rate"),
]
