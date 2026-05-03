# alerts/views.py
#
# Alert list and action endpoints.
# GET  /api/v1/alerts/             — active alerts ordered by urgency (FR-034)
# PATCH /api/v1/alerts/{id}/action/ — mark actioned (FR-040)

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet

from auth_module.permissions import ScopedQuerysetMixin
from .models import Alert, AlertStatus
from .serializers import AlertSerializer, ActionAlertSerializer


class AlertViewSet(ScopedQuerysetMixin, ReadOnlyModelViewSet):
    """
    Returns alerts scoped to the user's centre/sector/district.
    Default ordering: urgent first, then by date — FR-034.
    """
    queryset = Alert.objects.all()
    scope_field = "child__centre"
    serializer_class = AlertSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get("status", "active")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=True, methods=["patch"], url_path="action")
    def action_alert(self, request, pk=None):
        """
        PATCH /api/v1/alerts/{id}/action/
        Caregiver records that they have responded to the alert.
        FR-040.
        """
        alert = self.get_object()
        serializer = ActionAlertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        alert.status      = AlertStatus.ACTIONED
        alert.actioned_by = request.user.id
        alert.actioned_at = timezone.now()
        alert.action_taken = serializer.validated_data["action_taken"]
        alert.save(update_fields=["status", "actioned_by", "actioned_at", "action_taken"])

        return Response(AlertSerializer(alert).data)
