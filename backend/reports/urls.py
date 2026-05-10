from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("monthly", views.MonthlyReportViewSet, basename="monthly-reports")

urlpatterns = [
    path("", include(router.urls)),
    path("monthly/generate/",              views.GenerateMonthlyReportView.as_view(), name="report-generate"),
    path("monthly/<uuid:pk>/approve/",     views.MonthlyReportViewSet.as_view({"post": "approve"}), name="report-approve"),
    path("monthly/<uuid:pk>.pdf",          views.ReportExportView.as_view(), {"format_type": "pdf"}, name="report-pdf"),
    path("monthly/<uuid:pk>.csv",          views.ReportExportView.as_view(), {"format_type": "csv"}, name="report-csv"),
    path("sector/report.pdf",      views.SectorReportExportView.as_view(), name="sector-report-pdf"),
    path("dashboards/caregiver/",  views.CaregiverDashboardView.as_view(),        name="dashboard-caregiver"),
    path("dashboards/centre/",     views.CentreDashboardView.as_view(),           name="dashboard-centre"),
    path("dashboards/sector/",     views.SectorDashboardView.as_view(),           name="dashboard-sector"),
    path("dashboards/district/",   views.DistrictNationalDashboardView.as_view(), name="dashboard-district"),
    path("dashboards/national/",   views.DistrictNationalDashboardView.as_view(), name="dashboard-national"),
    path("sdg-indicators/",        views.SdgIndicatorsView.as_view(),             name="sdg-indicators"),
    path("children/<uuid:pk>/growth-report.pdf", views.ChildGrowthReportPDFView.as_view(), name="child-growth-report"),
]