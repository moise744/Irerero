# auth_module/models.py
#
# Custom user model with 8 roles and scope-based access.
# Every queryset in the system is filtered based on these fields.
# FR-002, FR-003, Appendix A

import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class Role(models.TextChoices):
    """
    The 8 user roles defined in SRS Appendix A.
    Each role has a different data scope and permission set.
    """
    CAREGIVER   = "caregiver",   "ECD Caregiver"
    CHW         = "chw",         "Community Health Worker"
    CENTRE_MGR  = "centre_mgr",  "Centre Manager"
    SECTOR      = "sector",      "Sector ECD Coordinator"
    DISTRICT    = "district",    "District ECD Officer"
    NATIONAL    = "national",    "National Administrator"
    SYS_ADMIN   = "sys_admin",   "System Administrator"
    PARTNER     = "partner",     "Read-Only Partner"


class IreroUserManager(BaseUserManager):
    """Custom manager for IreroUser."""

    def create_user(self, username, password=None, **extra_fields):
        if not username:
            raise ValueError("Username is required.")
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra_fields):
        extra_fields.setdefault("role", Role.SYS_ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(username, password, **extra_fields)


class IreroUser(AbstractBaseUser, PermissionsMixin):
    """
    System user — stores all 8 roles with their organisational scope.
    The scope fields (centre_id, sector_id, district_id) determine what
    data a user can see. The ORM enforces these limits on every queryset.

    SRS §8.1 User entity, FR-002, FR-003, FR-007, NFR-020
    """
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username        = models.CharField(max_length=100, unique=True)
    full_name       = models.CharField(max_length=200)
    role            = models.CharField(max_length=20, choices=Role.choices, default=Role.CAREGIVER)
    phone_number    = models.CharField(max_length=20, blank=True)
    email           = models.EmailField(blank=True)
    is_active       = models.BooleanField(default=True)
    is_staff        = models.BooleanField(default=False)
    last_login      = models.DateTimeField(null=True, blank=True)

    # Failed login tracking — FR-005 (lock after 5 attempts)
    failed_login_count = models.IntegerField(default=0)
    locked_until       = models.DateTimeField(null=True, blank=True)

    # PIN for quick mobile login — FR-008
    pin_hash = models.CharField(max_length=200, blank=True)

    # Organisational scope — drives queryset filtering (FR-003)
    # Only the relevant field is populated depending on the role.
    # centre_id → Caregiver, CHW, Centre Manager
    # sector_id → Sector Coordinator
    # district_id → District Officer
    # Both null → National Admin, SysAdmin, Partner
    centre_id   = models.UUIDField(null=True, blank=True)
    sector_id   = models.UUIDField(null=True, blank=True)
    district_id = models.UUIDField(null=True, blank=True)

    # FCM device token for push notifications — FR-079
    fcm_token = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD  = "username"
    REQUIRED_FIELDS = ["full_name"]

    objects = IreroUserManager()

    class Meta:
        db_table    = "users"
        verbose_name = "Irerero User"

    def __str__(self):
        return f"{self.full_name} ({self.get_role_display()})"

    @property
    def is_clinical_staff(self):
        """Returns True for roles that enter clinical data (Caregiver, CHW, Centre Manager)."""
        return self.role in {Role.CAREGIVER, Role.CHW, Role.CENTRE_MGR}

    @property
    def is_supervisory(self):
        """Returns True for roles that only view data across centres."""
        return self.role in {Role.SECTOR, Role.DISTRICT, Role.NATIONAL, Role.PARTNER}


class AuditLog(models.Model):
    """
    Tamper-proof audit log of all significant actions.
    Retained minimum 5 years — NFR-022.
    Covers: logins, data entry, modifications, deletions, report generation, exports.
    """
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user        = models.ForeignKey(IreroUser, on_delete=models.SET_NULL, null=True, related_name="audit_entries")
    action      = models.CharField(max_length=100)   # e.g. "child.create", "measurement.update"
    table_name  = models.CharField(max_length=100)
    record_id   = models.CharField(max_length=100, blank=True)
    old_value   = models.JSONField(null=True, blank=True)
    new_value   = models.JSONField(null=True, blank=True)
    ip_address  = models.GenericIPAddressField(null=True, blank=True)
    changed_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table   = "audit_log"
        ordering   = ["-changed_at"]

    def __str__(self):
        return f"{self.action} by {self.user} at {self.changed_at:%Y-%m-%d %H:%M}"
