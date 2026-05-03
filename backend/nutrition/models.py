# nutrition/models.py
#
# Nutrition programme enrolment, daily meals, and individual food intake flags.
# FR-048 to FR-053, SRS §8.1 NutritionProgramme, Meal entities

import uuid
from django.db import models


class ProgrammeType(models.TextChoices):
    SFP   = "sfp",   "Supplementary Feeding Programme (SFP) — for MAM"
    TFP   = "tfp",   "Therapeutic Feeding Programme (TFP) — for SAM"
    RUTF  = "rutf",  "Ready-to-Use Therapeutic Food (RUTF)"
    OTHER = "other", "Other Programme"


class ProgrammeOutcome(models.TextChoices):
    GRADUATED  = "graduated",  "Graduated — child recovered"
    DEFAULTED  = "defaulted",  "Defaulted — missed too many sessions"
    TRANSFERRED = "transferred", "Transferred to another centre"
    DIED       = "died",       "Died"
    ONGOING    = "ongoing",    "Ongoing"


class NutritionProgramme(models.Model):
    """
    Child's enrolment in a nutrition programme.
    Enrolment date, programme type, expected end date, and outcome all recorded.
    FR-050, SRS §8.1 NutritionProgramme entity.
    """
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    child            = models.ForeignKey(
        "children.Child", on_delete=models.PROTECT, related_name="nutrition_enrolments"
    )
    programme_type   = models.CharField(max_length=10, choices=ProgrammeType.choices)
    enrolment_date   = models.DateField()
    expected_end_date = models.DateField(null=True, blank=True)
    actual_end_date  = models.DateField(null=True, blank=True)
    outcome          = models.CharField(max_length=15, choices=ProgrammeOutcome.choices,
                                        default=ProgrammeOutcome.ONGOING)
    recorded_by      = models.UUIDField()
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "nutrition_programmes"
        ordering = ["-enrolment_date"]

    def __str__(self):
        return f"{self.child.full_name} — {self.get_programme_type_display()}"


class Meal(models.Model):
    """
    Daily meal record for a centre.
    Records what was served and how many children received the meal.
    FR-048, SRS §8.1 Meal entity.
    """
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    centre           = models.UUIDField()
    date             = models.DateField()
    menu_description = models.TextField()   # e.g. "Porridge with milk and banana"
    children_fed_count = models.IntegerField(default=0)
    recorded_by      = models.UUIDField()
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "meals"
        ordering = ["-date"]
        unique_together = [["centre", "date"]]

    def __str__(self):
        return f"Meal at centre {self.centre} on {self.date}"


class FoodIntakeFlag(models.Model):
    """
    Flags a specific child who did not eat or ate very little at a meal.
    Recorded against the child's profile as a 'poor food intake' event — FR-049.
    """
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    child       = models.ForeignKey(
        "children.Child", on_delete=models.PROTECT, related_name="food_intake_flags"
    )
    meal        = models.ForeignKey(Meal, on_delete=models.PROTECT, related_name="intake_flags")
    poor_intake = models.BooleanField(default=True)
    notes       = models.TextField(blank=True)
    recorded_by = models.UUIDField()
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table        = "food_intake_flags"
        unique_together = [["child", "meal"]]
        ordering        = ["-recorded_at"]

    def __str__(self):
        return f"Poor intake — {self.child.full_name} on {self.meal.date}"
