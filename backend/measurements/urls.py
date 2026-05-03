from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .chart_views import GrowthChartView

router = DefaultRouter()
router.register("", views.MeasurementViewSet, basename="measurements")

urlpatterns = [
    path("", include(router.urls)),
    path("<uuid:child_id>/growth-chart/", GrowthChartView.as_view(), name="growth-chart"),
]
