# sync/views.py
#
# Bulk sync endpoint and health check.
# UUID idempotency: same UUID submitted twice = safe upsert, no duplicate.
# Partial sync: each record acknowledged individually — FR-085, FR-088.
# After accepting records, queues Celery AI task for each affected child.

import os

from django.conf import settings
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SyncLog


class HealthCheckView(APIView):
    """
    GET /health/
    Mobile sync engine pings this to detect connectivity.
    No auth required — fast 200 response is all that matters.
    """
    permission_classes    = []
    authentication_classes = []

    def get(self, request):
        return Response({
            "status":      "ok",
            "server_time": timezone.now().isoformat(),
            "version":     "1.0.0",
        })


class SyncView(APIView):
    """
    POST /api/v1/sync/
    Accepts batched records from the mobile app.
    Each record is identified by its device-generated UUID.
    Sending the same UUID twice produces the same result — safe to retry.

    Response:
        accepted   — list of UUIDs successfully processed
        conflicts  — list of {uuid, reason} for records that could not be saved
        server_alerts — new alerts generated server-side since last sync
    FR-084, FR-085, FR-088, FR-089.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        payload   = request.data
        records   = payload.get("records", [])
        device_id = payload.get("device_id", "unknown")

        accepted        = []
        conflicts       = []
        affected_children = set()

        for record in records:
            record_type = record.get("type")
            record_uuid = record.get("uuid")

            if not record_uuid or not record_type:
                continue

            try:
                if record_type == "child":
                    child_id = self._upsert_child(record, request.user)
                    if child_id:
                        affected_children.add(str(child_id))
                elif record_type == "measurement":
                    child_id = self._upsert_measurement(record, request.user)
                    if child_id:
                        affected_children.add(str(child_id))
                elif record_type == "attendance":
                    self._upsert_attendance(record, request.user)
                elif record_type == "referral":
                    self._upsert_referral(record, request.user)
                accepted.append(record_uuid)
            except Exception as exc:
                conflicts.append({"uuid": record_uuid, "reason": str(exc)})

        # Log this sync session
        SyncLog.objects.create(
            device_id=device_id,
            user_id=request.user.id,
            records_received=len(records),
            records_accepted=len(accepted),
            records_conflicted=len(conflicts),
            ip_address=request.META.get("REMOTE_ADDR"),
        )

        # Queue AI processing for each child that had new data — architecture §3.2.5
        # Dev safety: when DEBUG=True and Redis/Celery are absent, skip queuing by default
        # so /sync/ never hangs on broker connection retries.
        celery_enabled = (
            not settings.DEBUG
            or os.environ.get("ENABLE_CELERY_SYNC", "").strip().lower() in {"1", "true", "yes", "on"}
        )
        if celery_enabled:
            for child_id in affected_children:
                try:
                    from ai.celery_tasks import process_child_after_sync
                    process_child_after_sync.delay(child_id)
                except Exception:
                    pass  # Celery may be unavailable; sync must still succeed.

        # Return any server-generated alerts for this device's children
        server_alerts = self._get_server_alerts(affected_children)

        return Response({
            "accepted":      accepted,
            "conflicts":     conflicts,
            "server_alerts": server_alerts,
        })

    def _upsert_child(self, record, user):
        from children.models import Child
        data = record.get("data", {})
        defaults = {
            "full_name":      data.get("full_name", ""),
            "date_of_birth":  data.get("date_of_birth"),
            "sex":            data.get("sex", "male"),
            "guardian_name":  data.get("guardian_name", ""),
            "guardian_phone": data.get("guardian_phone", ""),
            "home_village":   data.get("home_village", ""),
            "notes":          data.get("notes", ""),
            "created_by":     user.id,
        }
        # Allow partial updates from mobile (e.g. notes-only edits) without
        # wiping required FK fields on existing records.
        if data.get("centre_id") is not None:
            defaults["centre_id"] = data.get("centre_id")

        obj, _ = Child.objects.update_or_create(
            id=record["uuid"],
            defaults=defaults
        )
        return obj.id

    def _upsert_measurement(self, record, user):
        from measurements.models import Measurement, MeasurementSource
        from ai.zscore import compute_all_zscores, classify_nutritional_status
        from children.models import Child

        data     = record.get("data", {})
        child_id = data.get("child_id")

        try:
            child = Child.objects.get(id=child_id)
        except Child.DoesNotExist:
            raise ValueError(f"Child {child_id} not found on server.")

        weight = data.get("weight_kg")
        height = data.get("height_cm")
        muac   = data.get("muac_cm")

        z_result = compute_all_zscores(
            weight_kg=float(weight) if weight else None,
            height_cm=float(height) if height else None,
            muac_cm=float(muac) if muac else None,
            age_months=child.age_in_months,
            sex=child.sex,
        )
        ns = classify_nutritional_status(
            waz=z_result["waz"], haz=z_result["haz"],
            whz=z_result["whz"], muac_cm=float(muac) if muac else None,
        )

        Measurement.objects.update_or_create(
            id=record["uuid"],
            defaults={
                "child_id":          child_id,
                "weight_kg":         weight,
                "height_cm":         height,
                "muac_cm":           muac,
                "temperature_c":     data.get("temperature_c"),
                "head_circ_cm":      data.get("head_circ_cm"),
                "measurement_position": data.get("measurement_position", "standing"),
                "source":            data.get("source", MeasurementSource.MANUAL),
                "device_id":         data.get("device_id", ""),
                "waz_score":         z_result["waz"],
                "haz_score":         z_result["haz"],
                "whz_score":         z_result["whz"],
                "nutritional_status": ns,
                "biv_flagged":       z_result["biv_flagged"],
                "recorded_by":       user.id,
                "recorded_at":       data.get("recorded_at", timezone.now().isoformat()),
            }
        )
        return child_id

    def _upsert_attendance(self, record, user):
        from attendance.models import Attendance
        data = record.get("data", {})
        Attendance.objects.update_or_create(
            id=record["uuid"],
            defaults={
                "child_id":       data.get("child_id"),
                "date":           data.get("date"),
                "status":         data.get("status", "absent"),
                "absence_reason": data.get("absence_reason", ""),
                "recorded_by":    user.id,
            }
        )

    def _upsert_referral(self, record, user):
        from referrals.models import Referral
        data = record.get("data", {})
        Referral.objects.update_or_create(
            id=record["uuid"],
            defaults={
                "child_id":          data.get("child_id"),
                "referral_date":     data.get("referral_date"),
                "reason":            data.get("reason", ""),
                "health_centre_name": data.get("health_centre_name", ""),
                "status":            data.get("status", "pending"),
                "referred_by":       user.id,
            }
        )

    def _get_server_alerts(self, child_ids: set) -> list:
        """Returns new active alerts for the affected children to push back to device."""
        from alerts.models import Alert, AlertStatus
        from alerts.serializers import AlertSerializer

        if not child_ids:
            return []

        alerts = Alert.objects.filter(
            child_id__in=child_ids,
            status=AlertStatus.ACTIVE,
        ).order_by("-generated_at")[:20]

        return AlertSerializer(alerts, many=True).data
