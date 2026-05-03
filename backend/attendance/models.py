# attendance/models.py — already written above, copying to correct location
import uuid
from django.db import models

class AttendanceStatus(models.TextChoices):
    PRESENT = "present", "Present"
    ABSENT  = "absent",  "Absent"

class AbsenceReason(models.TextChoices):
    SICK             = "sick",             "Sick"
    FAMILY_EMERGENCY = "family_emergency", "Family Emergency"
    SEASONAL_FARMING = "seasonal_farming", "Seasonal Farming"
    PARENT_TRAVEL    = "parent_travel",    "Parent Travel"
    UNKNOWN          = "unknown",          "Unknown"

class Attendance(models.Model):
    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    child   = models.ForeignKey("children.Child", on_delete=models.PROTECT, related_name="attendance_records")
    date    = models.DateField()
    status  = models.CharField(max_length=10, choices=AttendanceStatus.choices, default=AttendanceStatus.ABSENT)
    absence_reason = models.CharField(max_length=20, choices=AbsenceReason.choices, blank=True)
    recorded_by = models.UUIDField()
    recorded_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table        = "attendance"
        unique_together = [["child", "date"]]
        ordering        = ["-date"]
        indexes         = [models.Index(fields=["child", "date"])]

    def __str__(self):
        return f"{self.child.full_name} — {self.date} ({self.status})"
