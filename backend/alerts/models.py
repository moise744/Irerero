# alerts/models.py
#
# AI-generated alert records.
# Alert severity uses the named labels from SRS FR-033:
#   urgent = SAM / Red
#   warning = MAM or declining trend / Yellow
#   information = At Risk / Green
# NOT colours. The UI layer maps labels to colours.
# FR-032, FR-033, FR-034, FR-035, FR-036, SRS §8.1 Alert entity

import uuid
from django.db import models


class AlertType(models.TextChoices):
    # Z-score based
    SAM_CLASSIFICATION   = "sam_classification",   "SAM Classification"
    MAM_CLASSIFICATION   = "mam_classification",   "MAM Classification"
    AT_RISK              = "at_risk",              "At Risk Classification"
    STUNTED              = "stunted",              "Stunting Detected"
    SEVERELY_STUNTED     = "severely_stunted",     "Severe Stunting Detected"
    UNDERWEIGHT          = "underweight",          "Underweight"

    # Trend-based — FR-032
    CONSECUTIVE_DECLINE  = "consecutive_decline",  "Consecutive Weight Decline"
    GROWTH_FALTERING     = "growth_faltering",     "Growth Faltering"
    ZSCORE_CROSSING      = "zscore_crossing",      "Z-Score Channel Crossing"
    DECLINING_MUAC       = "declining_muac",       "Declining MUAC Trend"
    SUDDEN_WEIGHT_DROP   = "sudden_weight_drop",   "Sudden Weight Drop"
    EARLY_WARNING        = "early_warning",        "Early Warning (Trend Projection)"

    # Other — FR-037, FR-041, FR-052, FR-057
    EXTENDED_ABSENCE     = "extended_absence",     "Extended Absence"
    REFERRAL_PENDING     = "referral_pending",     "Referral Not Actioned"
    NUTRITION_MISSED     = "nutrition_missed",     "Nutrition Programme Missed"
    IMMUNISATION_OVERDUE = "immunisation_overdue", "Immunisation Overdue"
    MEASUREMENT_OVERDUE  = "measurement_overdue",  "Measurement Overdue"
    COMMUNITY_LEVEL      = "community_level",      "Community-Level Alert"
    TEMPERATURE_HIGH     = "temperature_high",     "Fever Alert"
    TEMPERATURE_LOW      = "temperature_low",      "Hypothermia Alert"


class AlertSeverity(models.TextChoices):
    # Named labels from SRS FR-033 — mapped to colours in the UI layer
    URGENT      = "urgent",      "Urgent (SAM / Red)"
    WARNING     = "warning",     "Warning (MAM or declining trend / Yellow)"
    INFORMATION = "information", "Information (At Risk / Green)"


class AlertStatus(models.TextChoices):
    ACTIVE   = "active",   "Active — not yet seen or actioned"
    ACTIONED = "actioned", "Actioned — caregiver recorded response"
    RESOLVED = "resolved", "Resolved — condition no longer present"


class Alert(models.Model):
    """
    One alert record per detected concern.

    Every alert has a plain-language explanation in both English and Kinyarwanda.
    The trigger_data JSON stores the exact values and algorithm that caused the alert
    — required for quality review and AI debugging (AI-FR-019).

    Caregiver-facing text NEVER includes Z-score numbers or statistical terms (AI-FR-017).
    """
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    child       = models.ForeignKey(
        "children.Child", on_delete=models.PROTECT, related_name="alerts"
    )
    centre      = models.UUIDField()    # denormalised for queryset filtering

    alert_type  = models.CharField(max_length=30, choices=AlertType.choices)
    severity    = models.CharField(max_length=15, choices=AlertSeverity.choices)

    # Plain-language explanations — AI-FR-016, AI-FR-017
    explanation_en = models.TextField()
    explanation_rw = models.TextField()   # Kinyarwanda

    # CMAM-aligned recommended actions — FR-036
    recommendation_en = models.TextField()
    recommendation_rw = models.TextField()

    # Exact data that triggered this alert — AI-FR-019
    trigger_data    = models.JSONField()
    algorithm_used  = models.CharField(max_length=100)

    # SHAP feature importance for ML alerts — AI-FR-018
    shap_explanation = models.JSONField(null=True, blank=True)

    generated_at = models.DateTimeField(auto_now_add=True)

    # Action recording — FR-040
    status      = models.CharField(max_length=15, choices=AlertStatus.choices,
                                   default=AlertStatus.ACTIVE)
    actioned_by = models.UUIDField(null=True, blank=True)
    actioned_at = models.DateTimeField(null=True, blank=True)
    action_taken = models.TextField(blank=True)

    # For EXTENDED_ABSENCE — FR-044 (number of days absent must be stored)
    consecutive_days_absent = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = "alerts"
        ordering = [
            # Urgent first, then warning, then information — FR-034
            models.Case(
                models.When(severity="urgent", then=0),
                models.When(severity="warning", then=1),
                models.When(severity="information", then=2),
                default=3,
                output_field=models.IntegerField(),
            ),
            "-generated_at"
        ]
        indexes = [
            models.Index(fields=["child", "status"]),
            models.Index(fields=["centre", "severity", "status"]),
        ]

    def __str__(self):
        return f"{self.get_alert_type_display()} — {self.child.full_name} ({self.severity})"
