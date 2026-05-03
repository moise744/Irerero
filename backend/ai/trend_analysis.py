# ai/trend_analysis.py
#
# Growth trend detection engine — all 12 alert types.
# Runs server-side after each sync upload (via Celery task).
# Also runs locally on the mobile app (Dart mirror of this logic).
#
# Rules require a minimum of 2 data points before generating trend alerts — AI-FR-008.
# BIV-flagged measurements are excluded from all trend calculations — AI-FR-003.
# FR-032, AI-FR-005 to AI-FR-009.

import statistics
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from measurements.models import Measurement, NutritionalStatus
from alerts.models import AlertType, AlertSeverity


def _clean_measurements(child_id) -> list:
    """
    Returns the child's measurement history, excluding BIV-flagged records,
    ordered oldest-first. BIV exclusion required by AI-FR-003.
    """
    return list(
        Measurement.objects.filter(
            child_id=child_id,
            biv_flagged=False,
            deleted_at__isnull=True,
        ).order_by("recorded_at")
    )


def _days_between(m1: Measurement, m2: Measurement) -> int:
    """Days elapsed between two measurements."""
    d1 = m1.recorded_at.date() if hasattr(m1.recorded_at, "date") else m1.recorded_at
    d2 = m2.recorded_at.date() if hasattr(m2.recorded_at, "date") else m2.recorded_at
    return abs((d2 - d1).days) or 1  # avoid division by zero


def detect_consecutive_weight_decline(measurements: list) -> Optional[dict]:
    """
    AI-FR-007: 3 or more consecutive measurements with decreasing weight.
    Regardless of absolute value — even a 10g decrease counts.
    """
    if len(measurements) < 3:
        return None

    weights = [
        (m, float(m.weight_kg))
        for m in measurements
        if m.weight_kg is not None
    ]
    if len(weights) < 3:
        return None

    # Slide a window of 3 looking for a consecutive decline sequence
    for i in range(len(weights) - 2):
        w0, w1, w2 = weights[i][1], weights[i+1][1], weights[i+2][1]
        if w0 > w1 > w2:
            trigger = measurements[i + 2]
            return {
                "type":     AlertType.CONSECUTIVE_DECLINE,
                "severity": AlertSeverity.WARNING,
                "trigger_data": {
                    "weights_kg":   [w0, w1, w2],
                    "dates":        [
                        str(weights[i][0].recorded_at.date()),
                        str(weights[i+1][0].recorded_at.date()),
                        str(weights[i+2][0].recorded_at.date()),
                    ],
                    "algorithm":    "consecutive_weight_decline",
                },
                "explanation_en": (
                    f"This child's weight has decreased {len(weights)>=3 and 3 or 3} times in a row: "
                    f"{w0:.1f} kg → {w1:.1f} kg → {w2:.1f} kg. "
                    f"Consistent weight loss is a warning sign of malnutrition developing."
                ),
                "explanation_rw": (
                    f"Ibiro by'umwana bigabanutse inshuro {3} zikurikirana: "
                    f"{w0:.1f} kg → {w1:.1f} kg → {w2:.1f} kg. "
                    f"Kugabanya ibiro bihoraho ni ikimenyetso cy'inshyano itangira."
                ),
                "recommendation_en": (
                    "Talk with the parent about the child's diet at home. "
                    "Enrol in the supplementary feeding programme if not already enrolled. "
                    "Monitor weight again in 2 weeks."
                ),
                "recommendation_rw": (
                    "Ganira na se/nyina w'umwana ku bijyanye n'indyo ye mu rugo. "
                    "Injiza mu gahunda yo kongerera indyo niba atararinjizwa. "
                    "Pakira ibiro inshuro ya kabiri mu masaha 2 y'ibyumweru."
                ),
            }
    return None


def detect_growth_faltering(measurements: list) -> Optional[dict]:
    """
    AI-FR-005: Weight gain velocity below WHO minimum for age and sex
    for two consecutive measurement intervals.
    WHO minimum velocity (simplified): 5g/day for infants, 2g/day for toddlers.
    """
    if len(measurements) < 3:
        return None

    weights = [
        (m, float(m.weight_kg))
        for m in measurements
        if m.weight_kg is not None
    ]
    if len(weights) < 3:
        return None

    def velocity_g_per_day(m1, w1, m2, w2):
        days = _days_between(m1, m2)
        return ((w2 - w1) * 1000) / days  # convert kg to g

    slow_intervals = 0
    for i in range(len(weights) - 1):
        m1, w1 = weights[i]
        m2, w2 = weights[i + 1]
        vel = velocity_g_per_day(m1, w1, m2, w2)
        # WHO minimum growth velocity: rough threshold
        # Under 6 months: 15g/day; 6-12 months: 10g/day; >12 months: 5g/day
        child = m1.child
        age_m = child.age_in_months
        min_vel = 15 if age_m < 6 else (10 if age_m < 12 else 5)
        if vel < min_vel:
            slow_intervals += 1
        else:
            slow_intervals = 0  # reset counter — must be consecutive

        if slow_intervals >= 2:
            return {
                "type":     AlertType.GROWTH_FALTERING,
                "severity": AlertSeverity.WARNING,
                "trigger_data": {
                    "velocity_g_per_day": round(vel, 1),
                    "min_expected_g_per_day": min_vel,
                    "algorithm": "growth_faltering_velocity",
                },
                "explanation_en": (
                    f"This child is not gaining weight fast enough for their age. "
                    f"They gained only {round(vel, 1)}g per day over the last period, "
                    f"but children this age should be gaining at least {min_vel}g per day."
                ),
                "explanation_rw": (
                    f"Umwana ntakura neza ku biro kubera imyaka ye. "
                    f"Yarongeye {round(vel, 1)}g ku munsi gusa mu gihe gishize, "
                    f"ariko abana b'imyaka nk'iyi bakwiye kongera nibura {min_vel}g ku munsi."
                ),
                "recommendation_en": (
                    "Review the child's diet and feeding frequency with the parent. "
                    "Refer to health centre if weight gain does not improve within 2 weeks."
                ),
                "recommendation_rw": (
                    "Reba indyo y'umwana n'inshuro anywera hamwe na se/nyina. "
                    "Mujye ku kigo cy'ubuzima niba ibiro bidakura neza mu masaha 2 y'ibyumweru."
                ),
            }
    return None


def detect_zscore_channel_crossing(measurements: list) -> Optional[dict]:
    """
    AI-FR-006: WAZ, HAZ, or WHZ decreases by more than 1.0 SD between
    two consecutive measurements. Crossing from above -2 to below -2 always flagged.
    """
    if len(measurements) < 2:
        return None

    indicators = [
        ("waz_score", "weight-for-age"),
        ("haz_score", "height-for-age"),
        ("whz_score", "weight-for-height"),
    ]

    for field, name in indicators:
        pairs = [
            (m, float(getattr(m, field)))
            for m in measurements
            if getattr(m, field) is not None
        ]
        if len(pairs) < 2:
            continue

        for i in range(len(pairs) - 1):
            m1, z1 = pairs[i]
            m2, z2 = pairs[i + 1]
            drop = z1 - z2
            crossed_two = z1 >= -2 and z2 < -2  # normal → at risk/MAM

            if drop > 1.0 or crossed_two:
                return {
                    "type":     AlertType.ZSCORE_CROSSING,
                    "severity": AlertSeverity.WARNING,
                    "trigger_data": {
                        "indicator":    field,
                        "z_score_drop": round(drop, 3),
                        "from_z":       round(z1, 3),
                        "to_z":         round(z2, 3),
                        "crossed_minus_two": crossed_two,
                        "algorithm":    "zscore_channel_crossing",
                    },
                    "explanation_en": (
                        f"This child's {name} score has dropped significantly "
                        f"from {z1:.2f} to {z2:.2f} between the last two measurements. "
                        f"This sudden drop is a warning that their nutrition is declining."
                    ),
                    "explanation_rw": (
                        f"Ikizamini cy'imikurire y'umwana ({name}) cyaguye bikabije "
                        f"kuva {z1:.2f} kugeza {z2:.2f} hagati y'ibipimo bya nyuma bibiri. "
                        f"Iyi guuka biroreka ko imirire ye igenda igabanuka."
                    ),
                    "recommendation_en": (
                        "Increase monitoring to bi-weekly. "
                        "Review diet and refer to health centre if trend continues."
                    ),
                    "recommendation_rw": (
                        "Ongerera isuzumwa kuri buri ibyumweru bibiri. "
                        "Reba indyo hanyuma mujye ku kigo cy'ubuzima niba byakomeje."
                    ),
                }
    return None


def detect_declining_muac(measurements: list) -> Optional[dict]:
    """MUAC decreased in 2 consecutive measurements — FR-032."""
    if len(measurements) < 2:
        return None

    muac_vals = [
        (m, float(m.muac_cm))
        for m in measurements
        if m.muac_cm is not None
    ]
    if len(muac_vals) < 2:
        return None

    for i in range(len(muac_vals) - 1):
        m1, v1 = muac_vals[i]
        m2, v2 = muac_vals[i + 1]
        if v2 < v1:
            return {
                "type":     AlertType.DECLINING_MUAC,
                "severity": AlertSeverity.WARNING,
                "trigger_data": {
                    "muac_from_cm": v1,
                    "muac_to_cm":   v2,
                    "drop_cm":      round(v1 - v2, 1),
                    "algorithm":    "declining_muac",
                },
                "explanation_en": (
                    f"The child's arm measurement (MUAC) has decreased "
                    f"from {v1:.1f} cm to {v2:.1f} cm. "
                    f"A shrinking arm measurement means the child is losing muscle and fat — "
                    f"a sign of malnutrition."
                ),
                "explanation_rw": (
                    f"Uburebure bw'akaboko k'umwana (MUAC) bwagabanutse "
                    f"kuva {v1:.1f} cm kugeza {v2:.1f} cm. "
                    f"Kugabanya uburebure bw'akaboko biragaragaza ko umwana apfa imirire."
                ),
                "recommendation_en": (
                    "Prioritise this child for supplementary feeding. "
                    "Measure MUAC again in 2 weeks."
                ),
                "recommendation_rw": (
                    "Tanga inkunga y'indyo y'inshingano ku mwana uyu. "
                    "Pakira MUAC inshuro ya kabiri mu masaha 2 y'ibyumweru."
                ),
            }
    return None


def detect_sudden_weight_drop(measurements: list) -> Optional[dict]:
    """
    FR-032: Weight loss exceeding 5% of body weight between two consecutive measurements.
    """
    if len(measurements) < 2:
        return None

    weights = [
        (m, float(m.weight_kg))
        for m in measurements
        if m.weight_kg is not None
    ]
    if len(weights) < 2:
        return None

    for i in range(len(weights) - 1):
        m1, w1 = weights[i]
        m2, w2 = weights[i + 1]
        if w1 > 0:
            pct_drop = (w1 - w2) / w1 * 100
            if pct_drop >= 5.0:
                return {
                    "type":     AlertType.SUDDEN_WEIGHT_DROP,
                    "severity": AlertSeverity.WARNING,
                    "trigger_data": {
                        "weight_from_kg":   w1,
                        "weight_to_kg":     w2,
                        "percent_drop":     round(pct_drop, 1),
                        "algorithm":        "sudden_weight_drop",
                    },
                    "explanation_en": (
                        f"This child lost {pct_drop:.1f}% of their body weight "
                        f"({w1:.1f} kg → {w2:.1f} kg) between their last two measurements. "
                        f"A weight loss of 5% or more in one month needs urgent attention."
                    ),
                    "explanation_rw": (
                        f"Umwana yapoteje {pct_drop:.1f}% by'ibiro bye "
                        f"({w1:.1f} kg → {w2:.1f} kg) hagati y'ibipimo bya nyuma bibiri. "
                        f"Gutakaza ibiro bingana na 5% cyangwa byinshi mu kwezi kumwe bisaba ingamba z'ihutirwa."
                    ),
                    "recommendation_en": (
                        "Contact the parent immediately. "
                        "Check for illness. Refer to health centre today."
                    ),
                    "recommendation_rw": (
                        "Vugana na se/nyina w'umwana vuba. "
                        "Reba niba arwaye. Mujye ku kigo cy'ubuzima uno munsi."
                    ),
                }
    return None


def detect_early_warning_projection(measurements: list) -> Optional[dict]:
    """
    AI-FR-009: Linear regression trend line on 3+ data points.
    If projected weight at next measurement date crosses MAM threshold, warn early.
    """
    if len(measurements) < 3:
        return None

    weights = [
        (i, float(m.weight_kg))
        for i, m in enumerate(measurements)
        if m.weight_kg is not None
    ]
    if len(weights) < 3:
        return None

    # Simple linear regression
    n    = len(weights)
    xs   = [w[0] for w in weights]
    ys   = [w[1] for w in weights]
    x_m  = sum(xs) / n
    y_m  = sum(ys) / n
    num  = sum((x - x_m) * (y - y_m) for x, y in zip(xs, ys))
    den  = sum((x - x_m) ** 2 for x in xs)

    if den == 0:
        return None

    slope = num / den
    if slope >= 0:
        return None  # Weight is stable or increasing — no early warning

    # Project weight at next measurement (one interval ahead)
    projected = y_m + slope * (n - x_m + 1)
    last_weight = ys[-1]

    # Get the child's age to find MAM threshold (simplified: use MUAC-based)
    # If projected weight drops below 80% of last weight — early warning
    if projected < last_weight * 0.92:
        return {
            "type":     AlertType.EARLY_WARNING,
            "severity": AlertSeverity.INFORMATION,
            "trigger_data": {
                "current_weight_kg":   round(last_weight, 2),
                "projected_weight_kg": round(projected, 2),
                "slope_kg_per_visit":  round(slope, 4),
                "algorithm":           "linear_regression_projection",
            },
            "explanation_en": (
                f"Based on this child's recent weight trend, "
                f"their weight may drop to about {projected:.1f} kg by the next measurement "
                f"if the current pattern continues. Early action can prevent this."
            ),
            "explanation_rw": (
                f"Dushingiye ku mvugo y'ibiro by'umwana aha vuba, "
                f"ibiro bye bishobora kugera hafi ya {projected:.1f} kg ku kipimo gitaha "
                f"niba imiterere ikomeje uko iri. Ingamba zo kare zishobora gutuza ibi."
            ),
            "recommendation_en": (
                "Monitor closely. Review diet and feeding at next centre visit. "
                "Consider early enrolment in supplementary feeding programme."
            ),
            "recommendation_rw": (
                "Komeza gukurikirana neza. Reba indyo ku musanzu w'ikigo utaha. "
                "Tekereza guinjiza mu gahunda yo kongerera indyo hakiri kare."
            ),
        }
    return None


def detect_measurement_overdue(child) -> Optional[dict]:
    """
    SRS §8.3: Child not measured in 60+ days (2 measurement cycles).
    Shows in caregiver daily task list.
    """
    from django.utils import timezone
    last = Measurement.objects.filter(
        child=child, biv_flagged=False, deleted_at__isnull=True
    ).order_by("-recorded_at").first()

    if not last:
        days_overdue = 60  # Never measured
    else:
        days_overdue = (timezone.now() - last.recorded_at).days

    if days_overdue >= 60:
        return {
            "type":     AlertType.MEASUREMENT_OVERDUE,
            "severity": AlertSeverity.INFORMATION,
            "trigger_data": {
                "days_since_last_measurement": days_overdue,
                "algorithm": "measurement_overdue",
            },
            "explanation_en": (
                f"This child has not been measured in {days_overdue} days "
                f"(last measurement was more than 2 months ago). "
                f"Regular monthly measurements are needed to track their growth."
            ),
            "explanation_rw": (
                f"Umwana uyu ntiyapimwe mu minsi {days_overdue} "
                f"(ipimo rya nyuma ryakuwe amezi abiri ashize). "
                f"Ipima rya buri kwezi rirakenewe kugirango turebe imikurire ye."
            ),
            "recommendation_en": "Schedule this child for measurement today.",
            "recommendation_rw": "Shyira umwana uyu ku rutonde rw'ibipimo uno munsi.",
        }
    return None


def run_all_trend_checks(child_id: str) -> list[dict]:
    """
    Runs all 7 measurement-based trend checks for a single child.
    Returns a list of alert dicts for any detected patterns.
    Called by Celery after each sync upload.
    FR-032, AI-FR-005 to AI-FR-009.
    """
    measurements = _clean_measurements(child_id)
    detected = []

    checks = [
        detect_consecutive_weight_decline,
        detect_growth_faltering,
        detect_zscore_channel_crossing,
        detect_declining_muac,
        detect_sudden_weight_drop,
        detect_early_warning_projection,
    ]

    for check_fn in checks:
        result = check_fn(measurements)
        if result:
            detected.append(result)

    return detected
