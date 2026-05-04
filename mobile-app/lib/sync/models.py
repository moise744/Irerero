# nutrition/models.py (New logic for Task 20)
from django.db import models
from children.models import Child

class FoodIntakeFlag(models.Model):
    """Satisfies User Role 1, Task 20: Record Poor Food Intake."""
    child = models.ForeignKey(Child, on_delete=models.CASCADE)
    date = models.DateField(auto_now_add=True)
    intake_level = models.CharField(max_length=20, choices=[
        ('none', 'Did not eat'),
        ('poor', 'Ate very little'),
        ('good', 'Ate well')
    ])
    notes = models.TextField(blank=True)
    recorded_by = models.UUIDField()