# measurements/models.py
#
# Health measurement records.
# All five measurement types: weight, height, MUAC, temperature, head circumference.
# WHO Z-scores computed server-side after sync for verification.
# FR-019 to FR-027, SRS §8.1 Measurement entity

import uuid
from django.db import models


class NutritionalStatus(models.TextChoices):
    NORMAL           = "normal",           "Normal"
    AT_RISK          = "at_risk",          "At Risk"
    MAM              = "mam",              "Moderate Acute Malnutrition (MAM)"
    SAM              = "sam",              "Severe Acute Malnutrition (SAM)"
    STUNTED          = "stunted",          "Stunted"
    SEVERELY_STUNTED = "severely_stunted", "Severely Stunted"
    UNDERWEIGHT      = "underweight",      "Underweight"


class MeasurementSource(models.TextChoices):
    MANUAL     = "manual",     "Manual Entry"
    EMBEDDED   = "embedded",   "Embedded Device"
    SIMULATION = "simulation", "Simulation App"


class MeasurementPosition(models.TextChoices):
    STANDING = "standing", "Standing (Height)"
    LYING    = "lying",    "Lying Down (Length)"


class Measurement(models.Model):
    """
    Single health measurement session for one child.

    All values recorded to one decimal place — FR-019.
    Z-scores computed using WHO LMS method — FR-021.
    BIV-flagged records excluded from trend analysis until confirmed — AI-FR-003.
    Source field records whether manual or device — FR-026, ES-FR-005.

    Soft-deleted records retained 90 days — SRS §8.2.
    """
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    child       = models.ForeignKey(
        "children.Child", on_delete=models.PROTECT, related_name="measurements"
    )

    # The five measurement types — FR-019
    weight_kg       = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    height_cm       = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    muac_cm         = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    temperature_c   = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    head_circ_cm    = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)

    # For children under 2 years — FR-019
    measurement_position = models.CharField(
        max_length=10, choices=MeasurementPosition.choices,
        default=MeasurementPosition.STANDING, blank=True
    )

    # WHO Z-scores computed by AI module — FR-021
    waz_score = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True)
    haz_score = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True)
    whz_score = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True)

    # Classification result — FR-022
    nutritional_status = models.CharField(
        max_length=20, choices=NutritionalStatus.choices, blank=True
    )

    # BIV flag — AI-FR-003 (excluded from trend analysis until confirmed)
    biv_flagged = models.BooleanField(default=False)
    biv_confirmed = models.BooleanField(default=False)

    # Source tracking — FR-026, ES-FR-005
    source    = models.CharField(max_length=15, choices=MeasurementSource.choices,
                                 default=MeasurementSource.MANUAL)
    device_id = models.CharField(max_length=100, blank=True)

    # Audit trail — FR-026
    recorded_by = models.UUIDField()   # user id of caregiver who saved the record
    recorded_at = models.DateTimeField()

    # Soft-delete
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "measurements"
        ordering = ["-recorded_at"]
        indexes  = [
            models.Index(fields=["child", "recorded_at"]),
            models.Index(fields=["nutritional_status"]),
        ]

    def __str__(self):
        return (f"{self.child.full_name} — {self.recorded_at:%Y-%m-%d} "
                f"({self.nutritional_status})")

# Import milestone and immunisation models to register with Django
from .milestone_models import AgeBand, Milestone, ImmunisationStatus, Immunisation
