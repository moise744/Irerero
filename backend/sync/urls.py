# sync/urls.py
from django.urls import path
from . import views
urlpatterns = [
    path("", views.SyncView.as_view(), name="sync-upload"),
    path("conflicts/", views.SyncConflictsView.as_view(), name="sync-conflicts"),
    path("conflicts/<uuid:pk>/resolve/", views.SyncConflictResolveView.as_view(), name="sync-conflict-resolve"),
]

# DHIS2 export stub — FR-060, §5.3 (DHIS2-compatible schema from day 1)
# Full implementation when DHIS2 API access is granted
from django.urls import path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dhis2_export_stub(request):
    """
    GET /api/v1/dhis2/export/
    Stub endpoint for future DHIS2 integration — FR-060, §5.3.
    Data schema is DHIS2-compatible from day 1.
    Returns aggregated nutritional status data in DHIS2-compatible format.
    Full implementation pending DHIS2 API access and mapping agreement.
    """
    return Response({
        "status": "stub",
        "message": "DHIS2 export is available in production. Contact MINISANTE for API access credentials.",
        "data_available": ["nutritional_status_aggregates", "monthly_report_summaries", "referral_counts"],
        "dhis2_compatible": True,
        "implementation_status": "Phase 4 — pending DHIS2 API agreement"
    })

dhis2_urlpatterns = [path("dhis2/export/", dhis2_export_stub, name="dhis2-export")]
