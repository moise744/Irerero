# measurements/services.py
from django.utils import timezone
from datetime import timedelta
from .models import Immunisation, ImmunisationStatus

def initialize_rwanda_epi_schedule(child):
    """
    Generates the placeholder immunisation records for a new child
    based on the Rwanda National EPI Schedule.
    User Role 1, Task 21.
    """
    dob = child.date_of_birth
    
    # Definition of the Rwanda EPI Schedule
    schedule = [
        ("BCG", 0), ("Polio 0", 0),
        ("Polio 1", 6), ("Pentavalent 1", 6), ("Rotavirus 1", 6), ("PCV 1", 6),
        ("Polio 2", 10), ("Pentavalent 2", 10), ("Rotavirus 2", 10), ("PCV 2", 10),
        ("Polio 3", 14), ("Pentavalent 3", 14), ("IPV", 14), ("PCV 3", 14),
        ("Measles-Rubella 1", 39), # 9 months
        ("Measles-Rubella 2", 65), # 15 months
    ]
    
    for vaccine, weeks_offset in schedule:
        scheduled_date = dob + timedelta(weeks=weeks_offset)
        
        # Only create if not already exists
        Immunisation.objects.get_or_create(
            child=child,
            vaccine_name=vaccine,
            scheduled_date=scheduled_date,
            defaults={
                "status": ImmunisationStatus.DUE if scheduled_date >= timezone.now().date() else ImmunisationStatus.OVERDUE
            }
        )

def get_milestones_for_age(age_months):
    """
    Returns the Rwanda-adapted ECD screening checklist for a given age.
    User Role 1, Task 22.
    """
    if age_months <= 6:
        return {
            "gross_motor": "Holds head steady when held upright",
            "fine_motor": "Brings hands to mouth",
            "language": "Makes gurgling sounds",
            "social": "Spontaneously smiles at people"
        }
    elif age_months <= 12:
        return {
            "gross_motor": "Sits without support",
            "fine_motor": "Picks up small objects with thumb and forefinger",
            "language": "Simple gestures like shaking head 'no'",
            "social": "Shows preference for certain people"
        }
    elif age_months <= 24:
        return {
            "gross_motor": "Walks alone",
            "fine_motor": "Builds towers of 4 or more blocks",
            "language": "Points to things or pictures when named",
            "social": "Shows defiant behavior (doing what told not to)"
        }
    return {
        "notice": "Refer to age-appropriate Rwanda ECD Standards for children above 24 months."
    }