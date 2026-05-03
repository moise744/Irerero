# children/views.py
#
# Child registration, profile management, search and filter endpoints.
# Data scope enforced via ScopedQuerysetMixin on every queryset.
# FR-009 to FR-018

import django_filters
from django.utils import timezone
from rest_framework import status, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from auth_module.models import AuditLog
from auth_module.permissions import ScopedQuerysetMixin, IsClinicalStaff
from .models import Child, Centre
from .serializers import (
    ChildListSerializer, ChildDetailSerializer,
    RegisterChildSerializer, CentreSerializer
)


class ChildFilter(django_filters.FilterSet):
    """
    Supports searching and filtering the child register — FR-015.
    Filter by: name, Irerero ID, age group, nutritional status, sex, last measurement date.
    """
    name            = django_filters.CharFilter(field_name="full_name", lookup_expr="icontains")
    irerero_id      = django_filters.CharFilter(lookup_expr="icontains")
    sex             = django_filters.CharFilter()
    status          = django_filters.CharFilter()
    age_group       = django_filters.CharFilter(method="filter_age_group")
    last_measured_before = django_filters.DateFilter(method="filter_last_measured")

    class Meta:
        model  = Child
        fields = ["sex", "status"]

    def filter_age_group(self, qs, name, value):
        """Filter by age group: infant (0-2), toddler (2-4), preschool (4-6), school (6-8)."""
        today = timezone.now().date()
        ranges = {
            "infant":   (0, 2),
            "toddler":  (2, 4),
            "preschool": (4, 6),
            "school":   (6, 8),
        }
        if value in ranges:
            min_y, max_y = ranges[value]
            return qs.filter(
                date_of_birth__lte=today.replace(year=today.year - min_y),
                date_of_birth__gte=today.replace(year=today.year - max_y),
            )
        return qs

    def filter_last_measured(self, qs, name, value):
        return qs.filter(measurements__recorded_at__date__lte=value)


class ChildViewSet(ScopedQuerysetMixin, ModelViewSet):
    """
    Handles all child CRUD operations.
    Scope is enforced by ScopedQuerysetMixin — users see only their centre's children.
    """
    queryset = Child.objects.all()
    scope_field = "centre"
    filter_backends = [django_filters.rest_framework.DjangoFilterBackend,
                       filters.SearchFilter, filters.OrderingFilter]
    filterset_class  = ChildFilter
    search_fields    = ["full_name", "irerero_id", "guardian_name"]
    ordering_fields  = ["full_name", "date_of_birth", "enrolment_date"]
    ordering         = ["full_name"]

    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

    def get_serializer_class(self):
        if self.action == "list":
            return ChildListSerializer
        if self.action == "create":
            return RegisterChildSerializer
        return ChildDetailSerializer

    def perform_create(self, serializer):
        child = serializer.save(created_by=self.request.user.id)
        AuditLog.objects.create(
            user=self.request.user, action="child.create",
            table_name="children", record_id=str(child.id),
            new_value={"irerero_id": child.irerero_id, "full_name": child.full_name},
            ip_address=self.request.META.get("REMOTE_ADDR"),
        )

    def perform_update(self, serializer):
        old = ChildDetailSerializer(serializer.instance).data
        child = serializer.save()
        AuditLog.objects.create(
            user=self.request.user, action="child.update",
            table_name="children", record_id=str(child.id),
            old_value=old,
            new_value=ChildDetailSerializer(child).data,
            ip_address=self.request.META.get("REMOTE_ADDR"),
        )

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        """
        POST /api/v1/children/{id}/deactivate/
        Soft-deactivates a child profile — data retained, removed from active monitoring.
        FR-014
        """
        child = self.get_object()
        child.status = "inactive"
        child.save(update_fields=["status"])
        AuditLog.objects.create(
            user=request.user, action="child.deactivate",
            table_name="children", record_id=str(child.id),
        )
        return Response({"detail": f"{child.full_name} marked as inactive."})


class CentreViewSet(ModelViewSet):
    """ECD centre management — primarily used by SysAdmin."""
    queryset         = Centre.objects.filter(is_active=True)
    serializer_class = CentreSerializer
    permission_classes = [IsAuthenticated]


class MilestoneViewSet(ScopedQuerysetMixin, ModelViewSet):
    """
    POST /api/v1/children/milestones/ — record developmental milestone
    GET  /api/v1/children/milestones/?child={id}
    FR-029, 7 age bands.
    """
    scope_field = "child__centre"

    def get_queryset(self):
        from measurements.milestone_models import Milestone
        qs = Milestone.objects.all()
        child_id = self.request.query_params.get("child")
        if child_id:
            qs = qs.filter(child_id=child_id)
        return qs.order_by("age_band", "milestone_item")

    def get_serializer_class(self):
        from measurements.milestone_models import Milestone
        from rest_framework import serializers
        class MilestoneSerializer(serializers.ModelSerializer):
            class Meta:
                model  = Milestone
                fields = ["id","child","age_band","milestone_item","achieved","assessed_at","assessed_by"]
                read_only_fields = ["id", "assessed_by"]
        return MilestoneSerializer

    def perform_create(self, serializer):
        serializer.save(assessed_by=self.request.user.id)


class ImmunisationViewSet(ScopedQuerysetMixin, ModelViewSet):
    """
    GET /api/v1/children/immunisations/?child={id}
    POST /api/v1/children/immunisations/ — record vaccine administered
    FR-030: Rwanda EPI schedule.
    """
    scope_field = "child__centre"

    def get_queryset(self):
        from measurements.milestone_models import Immunisation
        qs = Immunisation.objects.all()
        child_id = self.request.query_params.get("child")
        if child_id:
            qs = qs.filter(child_id=child_id)
        return qs.order_by("scheduled_date")

    def get_serializer_class(self):
        from measurements.milestone_models import Immunisation
        from rest_framework import serializers
        class ImmunisationSerializer(serializers.ModelSerializer):
            class Meta:
                model  = Immunisation
                fields = ["id","child","vaccine_name","scheduled_date","administered_date","status","recorded_by"]
                read_only_fields = ["id", "recorded_by"]
        return ImmunisationSerializer

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user.id)
