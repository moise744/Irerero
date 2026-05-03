# ai/classification.py
#
# Nutritional status classification helpers used by both the API
# and the Celery trend detection tasks.
# Every classification is accompanied by a colour mapping, a display label,
# and the urgency level used in alerts — FR-022, FR-023, FR-033.
# The caregiver NEVER sees Z-score numbers — AI-FR-017.

from measurements.models import NutritionalStatus
from alerts.models import AlertSeverity


# Maps nutritional status to the urgency label used in Alert.severity
STATUS_TO_SEVERITY = {
    NutritionalStatus.SAM:              AlertSeverity.URGENT,
    NutritionalStatus.SEVERELY_STUNTED: AlertSeverity.URGENT,
    NutritionalStatus.MAM:              AlertSeverity.WARNING,
    NutritionalStatus.STUNTED:          AlertSeverity.WARNING,
    NutritionalStatus.UNDERWEIGHT:      AlertSeverity.WARNING,
    NutritionalStatus.AT_RISK:          AlertSeverity.INFORMATION,
    NutritionalStatus.NORMAL:           AlertSeverity.INFORMATION,
}

# Human-readable label used in caregiver UI — NO Z-scores, NO clinical jargon (AI-FR-017)
STATUS_LABEL_EN = {
    NutritionalStatus.NORMAL:           "Healthy — growing well",
    NutritionalStatus.AT_RISK:          "Watch closely — slightly below healthy range",
    NutritionalStatus.MAM:              "Moderate malnutrition — needs feeding support",
    NutritionalStatus.SAM:              "Severe malnutrition — needs urgent medical care",
    NutritionalStatus.STUNTED:          "Stunted growth — check nutrition and feeding",
    NutritionalStatus.SEVERELY_STUNTED: "Severely stunted growth — refer to health centre",
    NutritionalStatus.UNDERWEIGHT:      "Underweight — review diet and feeding frequency",
}

STATUS_LABEL_RW = {
    NutritionalStatus.NORMAL:           "Muzima — akura neza",
    NutritionalStatus.AT_RISK:          "Witondere — uri hafi ya ikibazo",
    NutritionalStatus.MAM:              "Imirire mibi yo hagati — akeneye inkunga y'indyo",
    NutritionalStatus.SAM:              "Imirire mibi ikabije — akeneye ubuvuzi bw'ihutirwa",
    NutritionalStatus.STUNTED:          "Igura bike — reba indyo n'imirire",
    NutritionalStatus.SEVERELY_STUNTED: "Igura bike cyane — mujye ku kigo cy'ubuzima",
    NutritionalStatus.UNDERWEIGHT:      "Ibiro bike — reba indyo no kunoza imirire",
}

# Colour codes used by web dashboard and mobile app (FR-023)
# Derived from severity label — NOT stored in the database
STATUS_COLOUR = {
    NutritionalStatus.NORMAL:           "green",
    NutritionalStatus.AT_RISK:          "yellow",
    NutritionalStatus.MAM:              "yellow",
    NutritionalStatus.SAM:              "red",
    NutritionalStatus.STUNTED:          "yellow",
    NutritionalStatus.SEVERELY_STUNTED: "red",
    NutritionalStatus.UNDERWEIGHT:      "yellow",
}

# Temperature alert thresholds — PUD §3.4
TEMP_HYPOTHERMIA  = 36.0   # below this → TEMPERATURE_LOW alert (urgent)
TEMP_NORMAL_LOW   = 36.5
TEMP_NORMAL_HIGH  = 37.5
TEMP_FEVER        = 38.0   # at or above this → TEMPERATURE_HIGH alert (warning)
TEMP_BIV_LOW      = 25.0   # below this → biologically implausible
TEMP_BIV_HIGH     = 43.0   # above this → biologically implausible


def get_status_display(status: str, lang: str = "en") -> dict:
    """
    Returns the full UI representation of a nutritional status.
    Used by mobile app and web dashboard to show colour + text + icon.
    FR-023, NFR-016.
    """
    label = STATUS_LABEL_RW.get(status, "") if lang == "rw" else STATUS_LABEL_EN.get(status, status)
    return {
        "status":   status,
        "label":    label,
        "colour":   STATUS_COLOUR.get(status, "green"),
        "severity": STATUS_TO_SEVERITY.get(status, AlertSeverity.INFORMATION),
    }


def check_temperature_alert(temp_c: float) -> str | None:
    """
    Returns alert type if temperature warrants an alert, else None.
    PUD §3.4 clinical thresholds.
    """
    if temp_c is None:
        return None
    if temp_c < TEMP_HYPOTHERMIA:
        return "temperature_low"
    if temp_c >= TEMP_FEVER:
        return "temperature_high"
    return None
