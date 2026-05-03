# measurements/milestone_models.py
#
# Developmental milestone assessments and immunisation tracking.
# FR-029: Rwanda-adapted ECD screening checklist — 7 age bands.
# FR-030: Rwanda EPI schedule tracking.

import uuid
from django.db import models


class AgeBand(models.TextChoices):
    """The 7 exact age bands from SRS FR-029."""
    ZERO_TO_6      = "0-6m",   "0 – 6 months"
    SIX_TO_12      = "6-12m",  "6 – 12 months"
    TWELVE_TO_24   = "12-24m", "12 – 24 months"
    TWENTY4_TO_36  = "24-36m", "24 – 36 months"
    THREE_TO_4     = "3-4y",   "3 – 4 years"
    FOUR_TO_5      = "4-5y",   "4 – 5 years"
    FIVE_TO_6      = "5-6y",   "5 – 6 years"


class Milestone(models.Model):
    """
    One milestone assessment item for one child.
    Items are grouped by age band — FR-029.
    """
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    child          = models.ForeignKey(
        "children.Child", on_delete=models.PROTECT, related_name="milestones"
    )
    age_band       = models.CharField(max_length=10, choices=AgeBand.choices)
    milestone_item = models.CharField(max_length=300)   # e.g. "Sits without support"
    achieved       = models.BooleanField(default=False)
    assessed_at    = models.DateField()
    assessed_by    = models.UUIDField()

    class Meta:
        db_table = "milestones"
        ordering = ["child", "age_band"]

    def __str__(self):
        status = "achieved" if self.achieved else "not yet"
        return f"{self.child.full_name} — {self.milestone_item} ({status})"


class ImmunisationStatus(models.TextChoices):
    DUE           = "due",           "Due"
    ADMINISTERED  = "administered",  "Administered"
    OVERDUE       = "overdue",       "Overdue"


class Immunisation(models.Model):
    """
    Tracks Rwanda EPI schedule compliance per child.
    Missing vaccinations trigger a reminder alert — FR-030.
    """
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    child            = models.ForeignKey(
        "children.Child", on_delete=models.PROTECT, related_name="immunisations"
    )
    vaccine_name     = models.CharField(max_length=100)
    scheduled_date   = models.DateField()
    administered_date = models.DateField(null=True, blank=True)
    status           = models.CharField(max_length=15, choices=ImmunisationStatus.choices,
                                        default=ImmunisationStatus.DUE)
    recorded_by      = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = "immunisation"
        ordering = ["child", "scheduled_date"]

    def __str__(self):
        return f"{self.child.full_name} — {self.vaccine_name} ({self.status})"
