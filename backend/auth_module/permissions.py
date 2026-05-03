# auth_module/permissions.py
#
# Scope-based data isolation enforced at queryset level — FR-003, Appendix A.
# Every view that returns child data must use the appropriate mixin.
# The permission classes here are for endpoint-level checks (can this role
# even touch this endpoint?). The queryset filtering happens in the mixin below.

from rest_framework.permissions import BasePermission
from .models import Role


# ── Role groups — used in permission checks ────────────────────────────────
CLINICAL_ROLES    = {Role.CAREGIVER, Role.CHW, Role.CENTRE_MGR}
SUPERVISORY_ROLES = {Role.SECTOR, Role.DISTRICT, Role.NATIONAL}
ALL_STAFF         = CLINICAL_ROLES | SUPERVISORY_ROLES | {Role.SYS_ADMIN}


class IsClinicalStaff(BasePermission):
    """Caregiver, CHW, Centre Manager — the data-entry roles."""
    def has_permission(self, request, view):
        return (request.user.is_authenticated
                and request.user.role in CLINICAL_ROLES)


class IsCentreManager(BasePermission):
    """Centre Manager only."""
    def has_permission(self, request, view):
        return (request.user.is_authenticated
                and request.user.role == Role.CENTRE_MGR)


class IsSupervisoryOrAbove(BasePermission):
    """Sector, District, National, SysAdmin — view-only across centres."""
    def has_permission(self, request, view):
        return (request.user.is_authenticated
                and request.user.role in (SUPERVISORY_ROLES | {Role.SYS_ADMIN}))


class IsSysAdmin(BasePermission):
    """System Administrator — full technical access."""
    def has_permission(self, request, view):
        return (request.user.is_authenticated
                and request.user.role == Role.SYS_ADMIN)


class CanEnterMeasurements(BasePermission):
    """Caregiver, CHW, Centre Manager can record measurements."""
    def has_permission(self, request, view):
        return (request.user.is_authenticated
                and request.user.role in CLINICAL_ROLES)


class CanCreateReferral(BasePermission):
    """Caregiver, CHW, Centre Manager can create referrals."""
    def has_permission(self, request, view):
        return (request.user.is_authenticated
                and request.user.role in CLINICAL_ROLES)


class CanExportReports(BasePermission):
    """Centre Manager and above can generate/export reports."""
    def has_permission(self, request, view):
        return (request.user.is_authenticated
                and request.user.role in (CLINICAL_ROLES - {Role.CAREGIVER, Role.CHW})
                | SUPERVISORY_ROLES | {Role.SYS_ADMIN})


# ── Queryset scope mixin — the core data isolation mechanism ───────────────
class ScopedQuerysetMixin:
    """
    Mixin that applies scope-based filtering to every queryset.
    This is where FR-003 is actually enforced — at the ORM level,
    not in view logic. It cannot be bypassed by changing request parameters.

    How to use in a ViewSet:
        class ChildViewSet(ScopedQuerysetMixin, ModelViewSet):
            scope_field = "centre_id"   # field on the model to filter by
    """
    # Subclasses set this to the field name on the model to filter by
    scope_field = "centre"

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        if user.role in {Role.NATIONAL, Role.SYS_ADMIN}:
            # Full access — no scope filter
            return qs

        if user.role == Role.PARTNER:
            # Partners see nothing individual — handled at serializer level
            return qs.none()

        if user.role == Role.DISTRICT:
            return qs.filter(**{f"{self.scope_field}__district_id": user.district_id})

        if user.role == Role.SECTOR:
            return qs.filter(**{f"{self.scope_field}__sector_id": user.sector_id})

        # Caregiver, CHW, Centre Manager — own centre only
        if user.centre_id:
            return qs.filter(**{f"{self.scope_field}_id": user.centre_id})

        return qs.none()
