# ai/celery_tasks.py
#
# Background Celery tasks that run after each sync upload.
# These run the full server-side AI pipeline:
#   1. Verify Z-scores
#   2. Run all trend detection checks
#   3. Check for community-level alerts
#   4. Check for extended absences
#   5. Check for referral pending reminders
#   6. Check for nutrition programme missed alerts
# FR-032 to FR-041, FR-044, FR-052, FR-057.

from celery import shared_task
from django.utils import timezone


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_child_after_sync(self, child_id: str):
    """
    Main AI processing task — triggered for each child after a sync upload.
    Runs all trend detection and generates alerts for any detected patterns.
    Also checks for community-level alerts — FR-041.
    """
    try:
        from children.models import Child
        from ai.trend_analysis import run_all_trend_checks
        from ai.alert_engine import generate_alert, check_community_alert

        child = Child.objects.get(id=child_id)
        detected_alerts = run_all_trend_checks(child_id)

        generated = []
        for alert_data in detected_alerts:
            alert = generate_alert(child, alert_data)
            if alert:
                generated.append(str(alert.id))

        # FR-041: Check community-level alert (>20% MAM/SAM in 30 days)
        community_alert_data = check_community_alert(str(child.centre_id))
        if community_alert_data:
            community_alert = generate_alert(child, community_alert_data)
            if community_alert:
                generated.append(str(community_alert.id))

        return {
            "child_id":  child_id,
            "alerts_generated": generated,
        }

    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task
def check_attendance_alerts():
    """
    Daily Celery beat task — checks every active child for extended absence.
    FR-037, FR-044: absence alert after 5+ consecutive centre days.
    """
    from children.models import Child, ChildStatus
    from attendance.models import Attendance, AttendanceStatus
    from ai.alert_engine import generate_alert
    from alerts.models import AlertType, AlertSeverity

    today = timezone.now().date()
    children = Child.objects.filter(status=ChildStatus.ACTIVE, deleted_at__isnull=True)

    for child in children:
        # Check last N attendance records for consecutive absences
        recent = list(
            Attendance.objects.filter(child=child, date__lte=today)
            .order_by("-date")[:10]
        )

        consecutive_absent = 0
        for record in recent:
            if record.status == AttendanceStatus.ABSENT:
                consecutive_absent += 1
            else:
                break

        if consecutive_absent >= 5:
            generate_alert(child, {
                "type":     AlertType.EXTENDED_ABSENCE,
                "severity": AlertSeverity.WARNING,
                "consecutive_days_absent": consecutive_absent,
                "trigger_data": {
                    "consecutive_days_absent": consecutive_absent,
                    "last_date_checked":       str(today),
                    "parent_phone":            child.guardian_phone,
                    "algorithm":               "extended_absence",
                },
                "explanation_en": (
                    f"{child.full_name} has been absent from the centre for "
                    f"{consecutive_absent} consecutive days. "
                    f"This needs immediate follow-up to check on the child's wellbeing."
                ),
                "explanation_rw": (
                    f"{child.full_name} yabaye atahari muri kigo iminsi "
                    f"{consecutive_absent} ikurikirana. "
                    f"Ibi bisaba gukurikirana vuba kugirango turebe imibereho ye."
                ),
                "recommendation_en": (
                    f"Contact the parent immediately. "
                    f"Parent phone: {child.guardian_phone}. "
                    f"Record the reason for absence and the action you took."
                ),
                "recommendation_rw": (
                    f"Vugana na se/nyina w'umwana vuba. "
                    f"Inomero ya telefoni: {child.guardian_phone}. "
                    f"Andika impamvu y'indunduro n'ingamba wafashe."
                ),
            })


@shared_task
def check_referral_pending_reminders():
    """
    Daily Celery beat task — reminds caregivers about referrals still Pending after 3 days.
    FR-057.
    """
    from referrals.models import Referral, ReferralStatus
    from alerts.models import AlertType, AlertSeverity
    from ai.alert_engine import generate_alert

    three_days_ago = timezone.now() - timezone.timedelta(days=3)
    pending = Referral.objects.filter(
        status=ReferralStatus.PENDING,
        created_at__lte=three_days_ago,
    ).select_related("child")

    for referral in pending:
        generate_alert(referral.child, {
            "type":     AlertType.REFERRAL_PENDING,
            "severity": AlertSeverity.WARNING,
            "trigger_data": {
                "referral_id":          str(referral.id),
                "referral_date":        str(referral.referral_date),
                "health_centre":        referral.health_centre_name,
                "days_pending":         (timezone.now().date() - referral.referral_date).days,
                "algorithm":            "referral_pending_reminder",
            },
            "explanation_en": (
                f"A referral was created for {referral.child.full_name} "
                f"on {referral.referral_date} to {referral.health_centre_name}, "
                f"but no outcome has been recorded yet. "
                f"Please follow up with the parent."
            ),
            "explanation_rw": (
                f"Urupapuro rwo guhanurira rwakozwe kuri {referral.child.full_name} "
                f"ku {referral.referral_date} kujya {referral.health_centre_name}, "
                f"ariko nta mateka yanditswe. Nyamuneka bikurikire na se/nyina."
            ),
            "recommendation_en": (
                f"Contact the parent: {referral.child.guardian_phone}. "
                f"Ask whether the child attended the health centre and record the outcome."
            ),
            "recommendation_rw": (
                f"Vugana na se/nyina: {referral.child.guardian_phone}. "
                f"Baza niba umwana yagiye ku kigo cy'ubuzima hanyuma wige ibituruka kuri ivyo."
            ),
        })


@shared_task
def check_nutrition_programme_missed():
    """
    Daily task — FR-052: alert when child misses 3+ consecutive programme days.
    """
    from nutrition.models import NutritionProgramme, ProgrammeOutcome
    from attendance.models import Attendance, AttendanceStatus
    from alerts.models import AlertType, AlertSeverity
    from ai.alert_engine import generate_alert

    active = NutritionProgramme.objects.filter(
        outcome=ProgrammeOutcome.ONGOING
    ).select_related("child")

    today = timezone.now().date()

    for enrolment in active:
        child = enrolment.child
        recent = list(
            Attendance.objects.filter(child=child, date__lte=today)
            .order_by("-date")[:5]
        )
        consecutive_absent = 0
        for record in recent:
            if record.status == AttendanceStatus.ABSENT:
                consecutive_absent += 1
            else:
                break

        if consecutive_absent >= 3:
            generate_alert(child, {
                "type":     AlertType.NUTRITION_MISSED,
                "severity": AlertSeverity.WARNING,
                "trigger_data": {
                    "programme_type":        enrolment.programme_type,
                    "consecutive_days_missed": consecutive_absent,
                    "algorithm":             "nutrition_programme_missed",
                },
                "explanation_en": (
                    f"{child.full_name} is enrolled in the "
                    f"{enrolment.get_programme_type_display()} but has missed "
                    f"{consecutive_absent} consecutive days. "
                    f"Missed sessions significantly reduce the effectiveness of treatment."
                ),
                "explanation_rw": (
                    f"{child.full_name} yinjijwe mu {enrolment.get_programme_type_display()} "
                    f"ariko yanze iminsi {consecutive_absent} ikurikirana. "
                    f"Kutaza ibikorwa bigabanya cyane ingufu zo kuvura."
                ),
                "recommendation_en": (
                    f"Contact the parent: {child.guardian_phone}. "
                    f"Find out why the child has been absent and encourage attendance."
                ),
                "recommendation_rw": (
                    f"Vugana na se/nyina: {child.guardian_phone}. "
                    f"Menya impamvu umwana atahari hanyuma umushishikarize kuza."
                ),
            })


@shared_task
def check_immunisation_overdue():
    """FR-030: remind caregivers of overdue vaccinations."""
    from measurements.milestone_models import Immunisation, ImmunisationStatus
    from alerts.models import AlertType, AlertSeverity
    from ai.alert_engine import generate_alert

    today = timezone.now().date()
    overdue = Immunisation.objects.filter(
        scheduled_date__lt=today,
        status=ImmunisationStatus.DUE,
    ).select_related("child")

    for imm in overdue:
        imm.status = ImmunisationStatus.OVERDUE
        imm.save(update_fields=["status"])

        generate_alert(imm.child, {
            "type":     AlertType.IMMUNISATION_OVERDUE,
            "severity": AlertSeverity.INFORMATION,
            "trigger_data": {
                "vaccine_name":     imm.vaccine_name,
                "scheduled_date":   str(imm.scheduled_date),
                "days_overdue":     (today - imm.scheduled_date).days,
                "algorithm":        "immunisation_overdue",
            },
            "explanation_en": (
                f"{imm.child.full_name} has a vaccination ({imm.vaccine_name}) "
                f"that was due on {imm.scheduled_date} but has not been recorded as given yet."
            ),
            "explanation_rw": (
                f"{imm.child.full_name} afite urukingo ({imm.vaccine_name}) "
                f"rwari rugomba gutangwa ku {imm.scheduled_date} ariko ntirarwandikwa nkaho rwatanzwe."
            ),
            "recommendation_en": "Take this child to the nearest health centre for vaccination.",
            "recommendation_rw": "Jyana umwana uyu ku kigo cy'ubuzima cy'inshuti kugirango bamurutse.",
        })


@shared_task
def generate_monthly_reports():
    """
    Celery beat task — runs at end of each calendar month.
    Auto-generates draft monthly reports for all active centres.
    FR-069, FR-070.
    """
    from children.models import Centre, Child, ChildStatus
    from measurements.models import Measurement
    from alerts.models import Alert as AlertModel, AlertStatus
    from referrals.models import Referral
    from nutrition.models import NutritionProgramme, ProgrammeOutcome
    from reports.models import MonthlyReport, ReportStatus
    from django.db.models import Count, Avg

    now = timezone.now()
    month = now.month - 1 if now.month > 1 else 12
    year  = now.year if now.month > 1 else now.year - 1

    for centre in Centre.objects.filter(is_active=True):
        # Skip if report already exists for this month
        if MonthlyReport.objects.filter(centre=centre.id, month=month, year=year).exists():
            continue

        children = Child.objects.filter(centre=centre, status=ChildStatus.ACTIVE)
        total = children.count()

        # Nutritional status distribution
        from django.db.models import Q
        from measurements.models import NutritionalStatus as NS
        status_counts = {}
        for status_val in NS.values:
            status_counts[status_val] = Measurement.objects.filter(
                child__centre=centre,
                recorded_at__month=month,
                recorded_at__year=year,
                nutritional_status=status_val,
            ).count()

        report_data = {
            "total_enrolled":          total,
            "total_enrolled_male":     children.filter(sex="male").count(),
            "total_enrolled_female":   children.filter(sex="female").count(),
            "nutritional_status":      status_counts,
            "new_sam_cases":           AlertModel.objects.filter(
                centre=centre.id,
                alert_type="sam_classification",
                generated_at__month=month,
                generated_at__year=year,
            ).count(),
            "new_mam_cases":           AlertModel.objects.filter(
                centre=centre.id,
                alert_type="mam_classification",
                generated_at__month=month,
                generated_at__year=year,
            ).count(),
            "total_referrals":         Referral.objects.filter(
                child__centre=centre,
                referral_date__month=month,
                referral_date__year=year,
            ).count(),
            "children_in_nutrition":   NutritionProgramme.objects.filter(
                child__centre=centre,
                outcome=ProgrammeOutcome.ONGOING,
            ).count(),
            "unresolved_alerts":       AlertModel.objects.filter(
                centre=centre.id,
                status=AlertStatus.ACTIVE,
            ).count(),
            "generated_at":            now.isoformat(),
        }

        MonthlyReport.objects.create(
            centre=centre.id,
            month=month,
            year=year,
            data=report_data,
            status=ReportStatus.DRAFT,
        )


@shared_task
def send_weekly_progress_sms():
    """
    FR-078: Weekly SMS to parents of children in MAM/SAM programmes.
    Shows weight gained and encourages continued attendance.
    Runs every Monday via Celery beat.
    """
    from nutrition.models import NutritionProgramme, ProgrammeOutcome
    from measurements.models import Measurement
    from notifications.providers import get_sms_provider

    provider = get_sms_provider()
    active = NutritionProgramme.objects.filter(
        outcome=ProgrammeOutcome.ONGOING
    ).select_related("child")

    for enrolment in active:
        child = enrolment.child
        if not child.guardian_phone:
            continue

        # Get last two measurements to calculate weekly change
        last_two = list(
            Measurement.objects.filter(child=child)
            .order_by("-recorded_at")[:2]
        )

        if len(last_two) >= 2 and last_two[0].weight_kg and last_two[1].weight_kg:
            gain_kg  = float(last_two[0].weight_kg) - float(last_two[1].weight_kg)
            gain_g   = int(gain_kg * 1000)
            if gain_g > 0:
                progress_text = f"Yarongeye ibiro {gain_g}g iki cyumweru."
            elif gain_g < 0:
                progress_text = f"Ibiro bye bygabanutse {abs(gain_g)}g. Komeza kubikurikirana."
            else:
                progress_text = "Ibiro bye bifite amahoro iki cyumweru."
        else:
            progress_text = "Komeza kuzana umwana buri munsi kugirango turebe imikurire ye."

        message = (
            f"Ubutumwa bw'inshuti ya Irerero: Umwana wawe {child.full_name} "
            f"aracyari mu gahunda ya {enrolment.get_programme_type_display()}. "
            f"{progress_text} "
            f"Komeza kuzana umwana ku kigo cy'ECD. Turi hamwe nkuze."
        )

        provider.send(
            to=child.guardian_phone,
            message=message,
            msg_type="weekly_progress",
            child_id=child.id,
        )


# ══════════════════════════════════════════════════════════════════════════════
# FR-059 MONTHLY REFERRAL SUMMARY — All 4 Required Fields
# total referrals made, percentage attended, common diagnoses,
# AND referrals with no recorded outcome (requiring follow-up)
# ══════════════════════════════════════════════════════════════════════════════
def get_monthly_referral_summary(centre_id, month, year):
    """
    FR-059: Returns all 4 required fields for the monthly referral summary:
      1. Total referrals made
      2. Percentage attended
      3. Common diagnoses (aggregated list)
      4. Referrals with no recorded outcome (requiring follow-up)
    This is called by generate_monthly_reports() and the reports API.
    """
    from referrals.models import Referral, ReferralStatus
    from django.db.models import Count
    from django.utils import timezone
    import calendar

    first_day = timezone.datetime(year, month, 1).date()
    last_day  = timezone.datetime(year, month, calendar.monthrange(year, month)[1]).date()

    qs = Referral.objects.filter(
        child__centre_id=centre_id,
        referral_date__gte=first_day,
        referral_date__lte=last_day,
    )
    total = qs.count()
    attended = qs.filter(status__in=[
        ReferralStatus.ATTENDED, ReferralStatus.TREATMENT_GIVEN, ReferralStatus.CLOSED
    ]).count()
    pct_attended = round(attended / total * 100, 1) if total > 0 else 0

    # Common diagnoses from closed referrals
    diagnoses = list(
        qs.exclude(diagnosis='').values('diagnosis')
        .annotate(count=Count('diagnosis')).order_by('-count')[:5]
    )

    # Referrals with no recorded outcome (still Pending > 3 days) — FR-059
    from datetime import timedelta
    three_days_ago = timezone.now().date() - timedelta(days=3)
    no_outcome = qs.filter(
        status=ReferralStatus.PENDING,
        referral_date__lte=three_days_ago,
    )
    no_outcome_count = no_outcome.count()
    no_outcome_list  = list(no_outcome.values('id', 'referral_date', 'health_centre_name',
                                               'child__full_name', 'reason')[:10])

    return {
        "total_referrals":           total,
        "total_attended":            attended,
        "percentage_attended":       pct_attended,
        "common_diagnoses":          diagnoses,
        "no_recorded_outcome_count": no_outcome_count,   # FR-059 4th required field
        "no_recorded_outcome_list":  no_outcome_list,    # names + dates for follow-up
        "requires_followup":         no_outcome_count > 0,
    }


# ══════════════════════════════════════════════════════════════════════════════
# FR-051 NUTRITION PROGRAMME SUMMARY — Estimated Food Quantities Consumed
# total enrolled, completion rates, avg weight gain, estimated food quantities
# ══════════════════════════════════════════════════════════════════════════════
def get_nutrition_programme_summary(centre_id, month, year):
    """
    FR-051: Monthly nutrition programme summary with all required fields including
    'estimated food quantities consumed' — the 4th required field.
    """
    from nutrition.models import NutritionProgramme, ProgrammeType, ProgrammeOutcome, Meal
    from measurements.models import Measurement
    from django.db.models import Avg
    import calendar

    active = NutritionProgramme.objects.filter(
        child__centre_id=centre_id,
        outcome=ProgrammeOutcome.ONGOING,
    )
    total_enrolled = active.count()
    by_type = {}
    for pt in ProgrammeType.values:
        by_type[pt] = active.filter(programme_type=pt).count()

    # Estimated food quantities consumed — FR-051
    # Based on meals served × standard serving sizes × children fed
    first_day = timezone.datetime(year, month, 1).date()
    last_day  = timezone.datetime(year, month, calendar.monthrange(year, month)[1]).date()
    meals_this_month = Meal.objects.filter(
        centre=centre_id, date__gte=first_day, date__lte=last_day
    )
    total_meal_portions = sum(m.children_fed_count for m in meals_this_month)
    # Estimate: ~250g of food per meal portion
    estimated_food_kg = round(total_meal_portions * 0.25, 1)

    return {
        "total_enrolled":             total_enrolled,
        "by_programme_type":          by_type,
        "total_meal_portions_served": total_meal_portions,
        "estimated_food_consumed_kg": estimated_food_kg,    # FR-051 4th field
        "meals_days_served":          meals_this_month.count(),
    }


# ══════════════════════════════════════════════════════════════════════════════
# FR-047 ATTENDANCE LINKED TO NUTRITIONAL STATUS
# Dashboard highlights children who are BOTH underweight AND have poor attendance
# ══════════════════════════════════════════════════════════════════════════════
def get_combined_risk_children(centre_id):
    """
    FR-047: Returns children who are BOTH underweight/malnourished AND have poor attendance.
    These children are at highest combined risk and should be highlighted on the dashboard.
    """
    from children.models import Child, ChildStatus
    from measurements.models import Measurement, NutritionalStatus
    from attendance.models import Attendance, AttendanceStatus
    from django.utils import timezone

    today      = timezone.now().date()
    month_ago  = today.replace(month=today.month - 1) if today.month > 1 else today.replace(year=today.year - 1, month=12)

    high_risk = []
    children  = Child.objects.filter(centre_id=centre_id, status=ChildStatus.ACTIVE)

    for child in children:
        last_m = Measurement.objects.filter(child=child).order_by("-recorded_at").first()
        if not last_m or last_m.nutritional_status not in [
            NutritionalStatus.SAM, NutritionalStatus.MAM,
            NutritionalStatus.UNDERWEIGHT, NutritionalStatus.AT_RISK
        ]:
            continue

        # Check attendance rate this month — FR-047
        total_days = Attendance.objects.filter(child=child, date__gte=month_ago, date__lte=today).count()
        if total_days == 0:
            continue
        present_days = Attendance.objects.filter(child=child, date__gte=month_ago, status=AttendanceStatus.PRESENT).count()
        rate = present_days / total_days

        # Flag if BOTH malnourished AND poor attendance (< 70%)
        if rate < 0.70:
            high_risk.append({
                "child_id":            str(child.id),
                "child_name":          child.full_name,
                "nutritional_status":  last_m.nutritional_status,
                "attendance_rate_pct": round(rate * 100, 1),
                "guardian_phone":      child.guardian_phone,
            })

    return sorted(high_risk, key=lambda x: x["attendance_rate_pct"])
