# children/models.py
#
# Child entity — the central record linking all measurements, alerts,
# referrals, attendance, and nutrition programme data together.
# SRS §8.1 Child entity, FR-009 to FR-018

import uuid
from django.db import models
from django.utils import timezone


class Centre(models.Model):
    """
    ECD centre (Irerero) record.
    SRS §8.1 Centre entity.
    GPS coordinates stored for future geographic map (FR-068).
    """
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code             = models.CharField(max_length=10, unique=True)   # e.g. "GIT" for Gitega
    centre_name      = models.CharField(max_length=200)
    sector_id        = models.UUIDField()
    district_id      = models.UUIDField()
    province         = models.CharField(max_length=100)
    gps_latitude     = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    gps_longitude    = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    centre_manager_id = models.UUIDField(null=True, blank=True)
    establishment_date = models.DateField(null=True, blank=True)
    is_active        = models.BooleanField(default=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "centres"
        ordering = ["centre_name"]

    def __str__(self):
        return f"{self.centre_name} ({self.code})"


class Sex(models.TextChoices):
    MALE   = "male",   "Male"
    FEMALE = "female", "Female"


class ChildStatus(models.TextChoices):
    ACTIVE   = "active",   "Active"
    INACTIVE = "inactive", "Inactive"


class Child(models.Model):
    """
    Core child profile — everything in Irerero connects back to this record.

    irerero_id is auto-generated in format [centre_code]-[year]-[seq], e.g. GIT-2025-0042.
    The profile is never hard-deleted — soft-delete sets deleted_at (SRS §8.2).

    FR-009 mandatory fields, FR-010 age validation, FR-011 Irerero ID,
    FR-012 complete profile, FR-014 inactive status, FR-016 photo,
    FR-017 sensitive optional fields.
    """
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    irerero_id      = models.CharField(max_length=20, unique=True, blank=True)
    centre          = models.ForeignKey(Centre, on_delete=models.PROTECT, related_name="children")

    # Mandatory registration fields — FR-009
    full_name       = models.CharField(max_length=200)
    date_of_birth   = models.DateField()
    sex             = models.CharField(max_length=10, choices=Sex.choices)
    guardian_name   = models.CharField(max_length=200)
    guardian_phone  = models.CharField(max_length=20)
    home_village    = models.CharField(max_length=200)   # Umudugudu

    enrolment_date  = models.DateField(default=timezone.localdate)
    status          = models.CharField(max_length=10, choices=ChildStatus.choices, default=ChildStatus.ACTIVE)

    # Optional fields — FR-016, FR-017
    photo           = models.ImageField(upload_to="child_photos/", null=True, blank=True)
    notes           = models.TextField(blank=True)   # Caregiver free-text observations

    # Sensitive optional fields — only visible to Centre Manager and above (FR-017)
    is_orphan           = models.BooleanField(null=True, blank=True)
    has_disability      = models.BooleanField(null=True, blank=True)
    hiv_exposure_status = models.BooleanField(null=True, blank=True)   # PMTCT follow-up
    chronic_conditions  = models.TextField(blank=True)

    # Soft-delete — SRS §8.2 (90-day retention before permanent removal)
    deleted_at = models.DateTimeField(null=True, blank=True)

    # Audit fields
    created_by = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "children"
        ordering = ["full_name"]
        indexes = [
            models.Index(fields=["centre", "status"]),
            models.Index(fields=["irerero_id"]),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.irerero_id})"

    def save(self, *args, **kwargs):
        """Auto-generate Irerero ID on first save — FR-011."""
        if not self.irerero_id:
            self.irerero_id = self._generate_irerero_id()
        super().save(*args, **kwargs)

    def _generate_irerero_id(self):
        """
        Generate ID in format [centre_code]-[year]-[seq].
        e.g. GIT-2025-0042
        The sequential number resets per centre per year.
        """
        from django.utils import timezone
        year = timezone.now().year
        existing = Child.objects.filter(
            centre=self.centre,
            irerero_id__startswith=f"{self.centre.code}-{year}-"
        ).count()
        seq = existing + 1
        return f"{self.centre.code}-{year}-{seq:04d}"

    @property
    def age_in_months(self):
        """Exact age in months at today's date — used for Z-score selection (FR-020)."""
        from dateutil.relativedelta import relativedelta
        from datetime import date as _date
        today = timezone.now().date()
        dob = self.date_of_birth
        # SQLite may return date_of_birth as a string
        if isinstance(dob, str):
            dob = _date.fromisoformat(dob)
        delta = relativedelta(today, dob)
        return delta.years * 12 + delta.months

    @property
    def is_overdue_for_measurement(self):
        """
        True if no measurement recorded in the last 60 days.
        Shown in caregiver daily task list — SRS §8.3.
        """
        from measurements.models import Measurement
        last = Measurement.objects.filter(child=self).order_by("-recorded_at").first()
        if not last:
            return True
        delta = timezone.now() - last.recorded_at
        return delta.days > 60
