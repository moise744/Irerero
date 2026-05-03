# attendance/views.py
#
# Daily attendance recording — FR-042 to FR-047.
# Bulk submission endpoint processes all 30 children in one POST.

from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
import django_filters

from auth_module.permissions import ScopedQuerysetMixin, CanEnterMeasurements
from .models import Attendance, AttendanceStatus
from .serializers import AttendanceSerializer, BulkAttendanceSerializer


class AttendanceViewSet(ScopedQuerysetMixin, ModelViewSet):
    """
    GET  /api/v1/attendance/?date=YYYY-MM-DD  — daily list
    POST /api/v1/attendance/                  — bulk submit
    FR-042, FR-043.
    """
    queryset = Attendance.objects.all()
    scope_field      = "child__centre"
    serializer_class = AttendanceSerializer
    filterset_fields = ["date", "status", "child"]

    def get_queryset(self):
        return super().get_queryset().order_by("child__full_name")

    def create(self, request, *args, **kwargs):
        """
        Accepts either a single record or a bulk list.
        Bulk format: { "records": [{child_id, status, date, absence_reason}, ...] }
        FR-042, FR-043.
        """
        if "records" in request.data:
            return self._bulk_create(request)
        return super().create(request, *args, **kwargs)

    @transaction.atomic
    def _bulk_create(self, request):
        """Process bulk attendance submission — up to 35 taps for 30 children (NFR-017)."""
        serializer = BulkAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        created = []
        for rec in serializer.validated_data["records"]:
            obj, _ = Attendance.objects.update_or_create(
                child_id=rec["child_id"],
                date=rec["date"],
                defaults={
                    "status":         rec["status"],
                    "absence_reason": rec.get("absence_reason", ""),
                    "recorded_by":    request.user.id,
                },
            )
            created.append(obj)

        return Response(
            AttendanceSerializer(created, many=True).data,
            status=status.HTTP_201_CREATED,
        )


class AttendanceRateView(APIView):
    """
    GET /api/v1/attendance/{child_id}/rate/
    Returns attendance rate over any selected time period — FR-045.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, child_id):
        from datetime import date
        date_from = request.query_params.get("from")
        date_to   = request.query_params.get("to", date.today().isoformat())

        qs = Attendance.objects.filter(child_id=child_id)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        qs = qs.filter(date__lte=date_to)

        total   = qs.count()
        present = qs.filter(status=AttendanceStatus.PRESENT).count()
        rate    = round((present / total * 100), 1) if total > 0 else 0

        return Response({
            "child_id":     child_id,
            "total_days":   total,
            "days_present": present,
            "days_absent":  total - present,
            "rate_percent": rate,
            "date_from":    date_from,
            "date_to":      date_to,
        })
