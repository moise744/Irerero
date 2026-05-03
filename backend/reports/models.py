# reports/models.py
#
# Monthly centre reports — auto-generated, manager reviews,
# approves, and submits electronically to sector coordinator.
# FR-069 to FR-075, SRS monthly_reports entity

import uuid
from django.db import models


class ReportStatus(models.TextChoices):
    DRAFT     = "draft",     "Draft — auto-generated, not yet reviewed"
    APPROVED  = "approved",  "Approved — manager has signed off"
    SUBMITTED = "submitted", "Submitted — sent to sector coordinator"


class MonthlyReport(models.Model):
    """
    Auto-generated at end of each calendar month — FR-069, FR-070.
    Manager reviews, adds notes, approves, and submits electronically — FR-070, FR-071.
    The report data JSON matches all Rwanda national ECD reporting fields.
    """
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    centre      = models.UUIDField()
    month       = models.IntegerField()   # 1-12
    year        = models.IntegerField()
    data        = models.JSONField(default=dict)   # Full report data
    status      = models.CharField(max_length=15, choices=ReportStatus.choices,
                                   default=ReportStatus.DRAFT)
    manager_notes = models.TextField(blank=True)

    created_at  = models.DateTimeField(auto_now_add=True)
    approved_by = models.UUIDField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table        = "monthly_reports"
        unique_together = [["centre", "month", "year"]]
        ordering        = ["-year", "-month"]

    def __str__(self):
        return f"Report — {self.year}-{self.month:02d} (centre {self.centre})"
