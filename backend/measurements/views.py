# measurements/views.py
#
# Measurement recording endpoint.
# After saving, immediately runs classification-based alert checks.
# Trend analysis runs in Celery background after sync.
# FR-019 to FR-027, FR-033.

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from auth_module.permissions import ScopedQuerysetMixin, CanEnterMeasurements
from ai.classification import get_status_display, check_temperature_alert
from .models import Measurement
from .serializers import RecordMeasurementSerializer, MeasurementSerializer


class MeasurementViewSet(ScopedQuerysetMixin, ModelViewSet):
    """
    POST /api/v1/measurements/            — record a measurement (FR-019)
    GET  /api/v1/measurements/?child={id} — measurement history
    """
    queryset = Measurement.objects.all()
    scope_field    = "child__centre"
    ordering       = ["-recorded_at"]

    def get_queryset(self):
        qs = super().get_queryset().filter(deleted_at__isnull=True)
        child_id = self.request.query_params.get("child")
        if child_id:
            qs = qs.filter(child_id=child_id)
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return RecordMeasurementSerializer
        return MeasurementSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), CanEnterMeasurements()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        """
        Save measurement, compute Z-scores, classify, check for status-based alerts
        and temperature alerts, then return the full result to the client.
        The client shows classification immediately — offline or online.
        FR-019, FR-022, FR-023, FR-033.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        measurement = serializer.save()

        # Generate immediate classification-based alert if status warrants it
        try:
            from ai.alert_engine import generate_status_alert
            generate_status_alert(measurement.child, measurement)
        except Exception:
            pass  # Alert generation must not block the measurement save

        # Temperature alert check — PUD §3.4
        temp_alerts = []
        if measurement.temperature_c:
            temp_alert_type = check_temperature_alert(float(measurement.temperature_c))
            if temp_alert_type:
                temp_alerts.append(temp_alert_type)

        # Status display for caregiver UI — no Z-score numbers (AI-FR-017)
        status_info = get_status_display(measurement.nutritional_status)

        return Response({
            "measurement":     MeasurementSerializer(measurement).data,
            "status_display":  status_info,
            "biv_flagged":     measurement.biv_flagged,
            "temperature_alerts": temp_alerts,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch"], url_path="confirm-biv")
    def confirm_biv(self, request, pk=None):
        """
        PATCH /api/v1/measurements/{id}/confirm-biv/
        Caregiver confirms a BIV-flagged measurement is correct.
        After confirmation, the measurement is included in trend analysis.
        AI-FR-003.
        """
        measurement = self.get_object()
        measurement.biv_confirmed = True
        measurement.save(update_fields=["biv_confirmed"])
        return Response(MeasurementSerializer(measurement).data)
