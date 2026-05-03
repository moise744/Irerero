from typing import Optional
# ai/alert_engine.py
#
# Central alert generation and notification engine.
# Called by Celery tasks after sync and by direct API calls.
# Generates alerts, sends FCM push notifications, and triggers SMS.
# FR-033, FR-034, FR-035, FR-036, FR-076, FR-079, AI-FR-016 to AI-FR-019.

import uuid
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from alerts.models import Alert, AlertType, AlertSeverity, AlertStatus
from measurements.models import NutritionalStatus


def generate_alert(child, alert_data: dict, save_to_db: bool = True) -> Alert | None:
    """
    Creates an Alert record from the structured alert data returned
    by any of the trend detection or classification functions.

    Skips creation if an identical active alert already exists for this child
    (prevents duplicate alerts on repeated syncs).

    AI-FR-019: every alert stores exact trigger_data and algorithm_used.
    """
    alert_type  = alert_data.get("type")
    severity    = alert_data.get("severity", AlertSeverity.WARNING)
    trigger     = alert_data.get("trigger_data", {})
    algorithm   = trigger.get("algorithm", "unknown")

    # Skip if this exact alert type is already active for this child
    already_active = Alert.objects.filter(
        child=child,
        alert_type=alert_type,
        status=AlertStatus.ACTIVE,
    ).exists()

    if already_active:
        return None

    if not save_to_db:
        return alert_data  # For offline preview — not persisted

    alert = Alert.objects.create(
        child=child,
        centre=child.centre_id,
        alert_type=alert_type,
        severity=severity,
        explanation_en=alert_data.get("explanation_en", ""),
        explanation_rw=alert_data.get("explanation_rw", ""),
        recommendation_en=alert_data.get("recommendation_en", ""),
        recommendation_rw=alert_data.get("recommendation_rw", ""),
        trigger_data=trigger,
        algorithm_used=algorithm,
        shap_explanation=alert_data.get("shap_explanation"),
        consecutive_days_absent=alert_data.get("consecutive_days_absent"),
    )

    # Push real-time update to web dashboard — architecture §5.4
    _push_alert_to_dashboard(alert)

    # Send FCM push to caregivers at this centre — FR-079
    _send_fcm_push(alert)

    # Send SMS for urgent alerts — FR-076
    if alert.severity == AlertSeverity.URGENT:
        _send_sam_sms(alert, child)

    return alert


def generate_status_alert(child, measurement) -> Alert | None:
    """
    Generates an alert based on the nutritional status of a single measurement.
    Called immediately after a measurement is saved.
    FR-033.
    """
    status = measurement.nutritional_status

    if status in {NutritionalStatus.NORMAL, NutritionalStatus.AT_RISK}:
        return None  # At Risk is shown in the UI but doesn't generate a specific alert

    status_alert_map = {
        NutritionalStatus.SAM:              AlertType.SAM_CLASSIFICATION,
        NutritionalStatus.MAM:              AlertType.MAM_CLASSIFICATION,
        NutritionalStatus.STUNTED:          AlertType.STUNTED,
        NutritionalStatus.SEVERELY_STUNTED: AlertType.SEVERELY_STUNTED,
        NutritionalStatus.UNDERWEIGHT:      AlertType.UNDERWEIGHT,
    }

    severity_map = {
        NutritionalStatus.SAM:              AlertSeverity.URGENT,
        NutritionalStatus.MAM:              AlertSeverity.WARNING,
        NutritionalStatus.STUNTED:          AlertSeverity.WARNING,
        NutritionalStatus.SEVERELY_STUNTED: AlertSeverity.URGENT,
        NutritionalStatus.UNDERWEIGHT:      AlertSeverity.WARNING,
    }

    explanations = {
        NutritionalStatus.SAM: (
            "This child has been classified with Severe Acute Malnutrition (SAM). "
            "This means their weight is dangerously low for their height and age. "
            "Immediate medical care is required.",
            "Umwana uyu yashyizwe mu cyiciro cy'inshyano ikabije (SAM). "
            "Ibi bivuze ko ibiro bye biri mu kaga ku burebure bwe no ku myaka ye. "
            "Ubuvuzi bw'ihutirwa burakenewe."
        ),
        NutritionalStatus.MAM: (
            "This child has been classified with Moderate Acute Malnutrition (MAM). "
            "Their weight is below the healthy range for their height and age. "
            "They need extra food support to recover.",
            "Umwana uyu yashyizwe mu cyiciro cy'inshyano yo hagati (MAM). "
            "Ibiro bye biri hasi y'umurego mwiza ku burebure bwe no ku myaka ye. "
            "Akeneye inkunga y'indyo yo kongera kugira ngo akire."
        ),
        NutritionalStatus.STUNTED: (
            "This child's height is below the healthy range for their age. "
            "This suggests they have not been getting enough nutrition over a long period.",
            "Uburebure bw'umwana uyu buri hasi y'umurego mwiza ku myaka ye. "
            "Ibi bigaragaza ko atari afite imirire ihagije mu gihe kirekire."
        ),
        NutritionalStatus.SEVERELY_STUNTED: (
            "This child's height is severely below the healthy range for their age. "
            "This indicates serious long-term malnutrition requiring medical support.",
            "Uburebure bw'umwana uyu buri munsi cyane y'umurego mwiza ku myaka ye. "
            "Ibi bigaragaza inshyano y'igihe kirekire ikabije isaba inkunga y'ubuvuzi."
        ),
        NutritionalStatus.UNDERWEIGHT: (
            "This child's weight is below the healthy range for their age. "
            "They may not be eating enough or may have an illness affecting their weight.",
            "Ibiro by'umwana uyu biri hasi y'umurego mwiza ku myaka ye. "
            "Ashobora kutarya bihagije cyangwa kuba arwaye ikintu kigabanya ibiro bye."
        ),
    }

    recommendations = {
        NutritionalStatus.SAM: (
            "Take this child to the nearest health centre TODAY. "
            "Enrol them in the RUTF (Ready-to-Use Therapeutic Food) programme immediately. "
            "Contact the parent now — phone number is shown below.",
            "Jyana umwana uyu ku kigo cy'ubuzima cy'inshuti UNO MUNSI. "
            "Muinjize vuba mu gahunda ya RUTF (Indyo yo kuvura). "
            "Vugana na se/nyina w'umwana ubu — inomero ya telefoni irari hepfo."
        ),
        NutritionalStatus.MAM: (
            "Enrol this child in the Supplementary Feeding Programme (SFP). "
            "Monitor their weight every 2 weeks. "
            "Counsel the parent on improving the child's diet at home.",
            "Injiza umwana uyu mu Gahunda yo Kongerera Indyo (SFP). "
            "Pakira ibiro bye buri ibyumweru bibiri. "
            "Gira inama na se/nyina ku kunoza indyo y'umwana mu rugo."
        ),
        NutritionalStatus.STUNTED: (
            "Increase nutrition counselling for the parent. "
            "Monitor height monthly. Refer to health centre if no improvement in 3 months.",
            "Ongerera se/nyina inama ku imirire. "
            "Pakira uburebure buri kwezi. Jyana ku kigo cy'ubuzima niba nta ntambwe mu mezi 3."
        ),
        NutritionalStatus.SEVERELY_STUNTED: (
            "Refer this child to the health centre for a full assessment. "
            "They need intensive nutrition support and medical evaluation.",
            "Rongera umwana uyu ku kigo cy'ubuzima kugirango basuzume vuba. "
            "Akeneye inkunga ikabije y'imirire n'isuzuma ry'ubuvuzi."
        ),
        NutritionalStatus.UNDERWEIGHT: (
            "Review the child's feeding practices with the parent. "
            "Check for illness. Monitor weight bi-weekly.",
            "Reba imikoreshereze y'indyo y'umwana hamwe na se/nyina. "
            "Reba niba arwaye. Pakira ibiro buri ibyumweru bibiri."
        ),
    }

    alert_type = status_alert_map.get(status)
    if not alert_type:
        return None

    exp_en, exp_rw = explanations.get(status, ("", ""))
    rec_en, rec_rw = recommendations.get(status, ("", ""))

    return generate_alert(child, {
        "type":             alert_type,
        "severity":         severity_map.get(status, AlertSeverity.WARNING),
        "explanation_en":   exp_en,
        "explanation_rw":   exp_rw,
        "recommendation_en": rec_en,
        "recommendation_rw": rec_rw,
        "trigger_data": {
            "nutritional_status":  status,
            "measurement_id":      str(measurement.id),
            "weight_kg":           str(measurement.weight_kg),
            "height_cm":           str(measurement.height_cm),
            "muac_cm":             str(measurement.muac_cm),
            "waz_score":           str(measurement.waz_score),
            "haz_score":           str(measurement.haz_score),
            "whz_score":           str(measurement.whz_score),
            "algorithm":           "nutritional_status_classification",
        },
    })


def _push_alert_to_dashboard(alert: Alert):
    """Push new alert to web dashboard via WebSocket — architecture §5.4."""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "alerts",
            {
                "type": "alert.new",
                "data": {
                    "id":           str(alert.id),
                    "child_id":     str(alert.child_id),
                    "child_name":   alert.child.full_name,
                    "alert_type":   alert.alert_type,
                    "severity":     alert.severity,
                    "generated_at": alert.generated_at.isoformat(),
                    "explanation":  alert.explanation_en,
                },
            }
        )
    except Exception:
        pass  # WebSocket push is best-effort


def _send_fcm_push(alert: Alert):
    """
    Send FCM push notification to caregivers at the centre — FR-079.
    Notification body NEVER contains sensitive child health data — SRS §9.4.
    """
    from auth_module.models import IreroUser, Role
    from notifications.models import FcmNotification

    caregivers = IreroUser.objects.filter(
        centre_id=alert.centre,
        role__in=[Role.CAREGIVER, Role.CHW, Role.CENTRE_MGR],
        is_active=True,
    ).exclude(fcm_token="")

    for user in caregivers:
        # Safe notification body — no sensitive clinical data visible on lock screen
        body = "You have a new alert. Open Irerero to view details."
        if alert.severity == AlertSeverity.URGENT:
            body = "Urgent: A child at your centre needs immediate attention."

        FcmNotification.objects.create(
            user_id=user.id,
            device_token=user.fcm_token,
            title="Irerero Alert",
            body=body,
            data={
                "alert_id":   str(alert.id),
                "alert_type": alert.alert_type,
                "child_id":   str(alert.child_id),
                "severity":   alert.severity,
            },
        )
        # TODO: Phase 4 — call firebase_admin.messaging.send() here


def _send_sam_sms(alert: Alert, child):
    """
    Send SAM alert SMS to child's guardian in Kinyarwanda — FR-076.
    Uses the configured SMS provider (mock or real).
    """
    from notifications.providers import get_sms_provider

    if not child.guardian_phone:
        return

    message = (
        f"Ubutumwa bw'inshuti ya Irerero: Umwana wawe {child.full_name} "
        f"agaragaza ibimenyetso by'inshyano ikabije (SAM). "
        f"Mwimukire ku kigo cy'ubuzima none none. "
        f"Nimufite ikibazo, muhamagare kigo cy'ECD."
    )

    provider = get_sms_provider()
    provider.send(
        to=child.guardian_phone,
        message=message,
        msg_type="sam_alert",
        child_id=child.id,
        alert_id=alert.id,
    )


def check_community_alert(centre_id: str) -> Optional[dict]:
    """
    FR-041: If more than 20% of children at a centre are newly classified
    MAM or SAM within the last 30 days, generate a community-level alert.
    """
    from django.db.models import Count
    from children.models import Child
    from django.utils import timezone

    total_children = Child.objects.filter(
        centre_id=centre_id, status="active", deleted_at__isnull=True
    ).count()

    if total_children < 5:  # Need at least 5 children for this to be meaningful
        return None

    thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
    new_cases = Alert.objects.filter(
        centre=centre_id,
        alert_type__in=[AlertType.SAM_CLASSIFICATION, AlertType.MAM_CLASSIFICATION],
        generated_at__gte=thirty_days_ago,
    ).values("child_id").distinct().count()

    pct = (new_cases / total_children) * 100

    if pct > 20:
        return {
            "type":     AlertType.COMMUNITY_LEVEL,
            "severity": AlertSeverity.URGENT,
            "trigger_data": {
                "total_children":       total_children,
                "new_mam_sam_cases":    new_cases,
                "percent_affected":     round(pct, 1),
                "period_days":          30,
                "algorithm":            "community_level_alert",
            },
            "explanation_en": (
                f"{new_cases} out of {total_children} children at this centre "
                f"({pct:.0f}%) have been classified as malnourished in the last 30 days. "
                f"This may indicate a community-wide food shortage or disease outbreak."
            ),
            "explanation_rw": (
                f"{new_cases} mu bana {total_children} bo muri iki kigo "
                f"({pct:.0f}%) bashyizwe mu cyiciro cy'inshyano mu minsi 30 ishize. "
                f"Ibi bishobora kugaragaza inzara cyangwa indwara mu mudugudu wose."
            ),
            "recommendation_en": (
                "Report immediately to the Sector ECD Coordinator. "
                "Contact the District Health Office. "
                "Request emergency food support from WFP or local government."
            ),
            "recommendation_rw": (
                "Menyesha vuba Umuyobozi w'ECD w'Umurenge. "
                "Vugana n'Ubuvuzi bw'Akarere. "
                "Saba inkunga y'indyo y'ihutirwa WFP cyangwa leta y'akarere."
            ),
        }
    return None


