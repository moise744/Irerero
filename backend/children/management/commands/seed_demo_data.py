# children/management/commands/seed_demo_data.py
#
# Creates comprehensive demo data for local development and project demonstration.
# Run: python manage.py seed_demo_data
#
# Creates 3 centres, users for all 8 roles, 15 children across centres,
# 3-6 measurements per child over 6 months, attendance records,
# referrals, alerts, and nutrition programme enrolments.

import random
import uuid
from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from auth_module.models import IreroUser, Role
from children.models import Centre, Child


# Fixed UUIDs so sector/district dashboards work consistently
SECTOR_UUID   = uuid.UUID("aaaaaaaa-1111-1111-1111-111111111111")
DISTRICT_UUID = uuid.UUID("bbbbbbbb-2222-2222-2222-222222222222")


class Command(BaseCommand):
    help = "Seeds the database with comprehensive demo data for development and testing."

    def handle(self, *args, **options):
        self.stdout.write("\n[*] Seeding Irerero demo data...\n")

        # ── Centres ────────────────────────────────────────────────
        centres = []
        centre_defs = [
            ("GIT", "Gitega ECD Centre",  "Northern Province", -1.5174, 29.6343),
            ("KIC", "Kicukiro ECD Centre", "Kigali Province",  -1.9740, 30.1127),
            ("HUY", "Huye ECD Centre",     "Southern Province", -2.5966, 29.7394),
        ]
        for code, name, province, lat, lng in centre_defs:
            centre, _ = Centre.objects.get_or_create(
                code=code,
                defaults={
                    "centre_name":       name,
                    "sector_id":         SECTOR_UUID,
                    "district_id":       DISTRICT_UUID,
                    "province":          province,
                    "gps_latitude":      lat,
                    "gps_longitude":     lng,
                    "establishment_date": date(2023, 1, 15),
                },
            )
            centres.append(centre)
            self.stdout.write(f"  [Centre] {centre.centre_name} ({centre.code})")

        # ── Users (1 per role) ─────────────────────────────────────
        users = [
            ("caregiver01", "Uwimana Jeanne",   Role.CAREGIVER,  centres[0]),
            ("chw01",       "Habimana Jean",    Role.CHW,        centres[0]),
            ("manager01",   "Mukamana Alice",   Role.CENTRE_MGR, centres[0]),
            ("caregiver02", "Murekeyisoni Aline",Role.CAREGIVER, centres[1]),
            ("manager02",   "Iradukunda Eric",  Role.CENTRE_MGR, centres[1]),
            ("sector01",    "Bizimana Pierre",  Role.SECTOR,     None),
            ("district01",  "Nkurunziza Paul",  Role.DISTRICT,   None),
            ("national01",  "Uwase Marie",      Role.NATIONAL,   None),
            ("admin",       "System Admin",     Role.SYS_ADMIN,  None),
            ("partner01",   "UNICEF Partner",   Role.PARTNER,    None),
        ]
        demo_password = "Irerero2025!"
        for username, full_name, role, centre in users:
            user, created = IreroUser.objects.get_or_create(
                username=username,
                defaults={
                    "full_name":   full_name,
                    "role":        role,
                    "centre_id":   centre.id if centre else None,
                    "sector_id":   SECTOR_UUID if role == Role.SECTOR else None,
                    "district_id": DISTRICT_UUID if role == Role.DISTRICT else None,
                },
            )
            # Always set demo password + unlock — get_or_create skips set_password when the
            # row already exists (e.g. old DB / re-seed), which otherwise breaks logins.
            user.set_password(demo_password)
            user.failed_login_count = 0
            user.locked_until = None
            user.is_active = True
            user.save()
            tag = "created" if created else "updated (password reset)"
            self.stdout.write(f"  [User] {username} / {demo_password} ({role}) - {tag}")

        # ── Children — 5 per centre ───────────────────────────────
        caregiver = IreroUser.objects.filter(role=Role.CAREGIVER).first()
        all_children = []
        child_defs = [
            # Centre 0 — Gitega
            ("Amina Uwimana",    "2023-03-15", "female", 0),
            ("David Habimana",   "2022-07-22", "male",   0),
            ("Grace Mukamana",   "2024-01-10", "female", 0),
            ("Patrick Nzeyimana","2022-11-05", "male",   0),
            ("Leila Ingabire",   "2023-08-30", "female", 0),
            # Centre 1 — Kicukiro
            ("Emmanuel Rugema",  "2023-05-18", "male",   1),
            ("Diane Uwera",      "2022-12-03", "female", 1),
            ("Christian Mugisha","2024-02-28", "male",   1),
            ("Francine Igihozo","2023-09-12", "female", 1),
            ("Jean-Paul Ndoli",  "2022-06-25", "male",   1),
            # Centre 2 — Huye
            ("Solange Mutesi",   "2023-01-08", "female", 2),
            ("Olivier Hakizimana","2022-04-14", "male",  2),
            ("Esther Umutoni",   "2024-04-20", "female", 2),
            ("Samuel Nshimiye",  "2023-07-07", "male",   2),
            ("Marie Claire Ikirezi","2022-10-19","female",2),
        ]
        phones = ["+250788100001", "+250788100002", "+250788100003",
                   "+250788100004", "+250788100005"]
        villages = ["Gitega Cell", "Kicukiro Cell", "Huye Cell",
                     "Muhanga Cell", "Rubavu Cell"]

        for name, dob, sex, ci in child_defs:
            child, created = Child.objects.get_or_create(
                full_name=name,
                date_of_birth=dob,
                centre=centres[ci],
                defaults={
                    "sex":            sex,
                    "guardian_name":   f"Parent of {name.split()[0]}",
                    "guardian_phone":  random.choice(phones),
                    "home_village":    random.choice(villages),
                    "enrolment_date":  date(2024, 1, 1),
                    "created_by":     caregiver.id if caregiver else None,
                },
            )
            all_children.append(child)
            if created:
                self.stdout.write(f"  [Child] {child.full_name} ({child.irerero_id})")

        # ── Measurements — 3-6 per child over last 6 months ──────
        from measurements.models import Measurement, MeasurementSource
        from ai.zscore import compute_all_zscores, classify_nutritional_status

        now = timezone.now()
        measurement_count = 0
        for child in all_children:
            age_months = child.age_in_months
            num = random.randint(3, 6)
            # Realistic starting values based on age
            base_weight = 3.5 + age_months * 0.4 + random.uniform(-1, 1)
            base_height = 50 + age_months * 1.8 + random.uniform(-3, 3)
            base_muac = 11.0 + age_months * 0.1 + random.uniform(-1, 1.5)

            for j in range(num):
                days_ago = (num - j) * 30 + random.randint(-5, 5)
                rec_at = now - timedelta(days=max(1, days_ago))

                weight = round(base_weight + j * random.uniform(0.2, 0.6), 1)
                height = round(base_height + j * random.uniform(0.5, 1.5), 1)
                muac   = round(base_muac + j * random.uniform(0.05, 0.2), 1)

                # Simulate some malnourished children
                if child.full_name in ("Grace Mukamana", "Christian Mugisha"):
                    weight = round(weight * 0.72, 1)   # SAM-level
                    muac   = round(muac * 0.82, 1)
                elif child.full_name in ("Patrick Nzeyimana", "Jean-Paul Ndoli"):
                    weight = round(weight * 0.82, 1)   # MAM-level

                weight = max(2.0, weight)
                height = max(45.0, height)
                muac   = max(8.0, muac)

                try:
                    z = compute_all_zscores(
                        weight_kg=weight, height_cm=height,
                        muac_cm=muac, age_months=age_months, sex=child.sex,
                    )
                    ns = classify_nutritional_status(
                        waz=z["waz"], haz=z["haz"], whz=z["whz"], muac_cm=muac,
                    )
                except Exception:
                    z = {"waz": None, "haz": None, "whz": None, "biv_flagged": False}
                    ns = "normal"

                Measurement.objects.get_or_create(
                    child=child,
                    recorded_at=rec_at,
                    defaults={
                        "weight_kg":          Decimal(str(weight)),
                        "height_cm":          Decimal(str(height)),
                        "muac_cm":            Decimal(str(muac)),
                        "source":             MeasurementSource.MANUAL,
                        "waz_score":          z["waz"],
                        "haz_score":          z["haz"],
                        "whz_score":          z["whz"],
                        "nutritional_status": ns,
                        "biv_flagged":        z["biv_flagged"],
                        "recorded_by":        caregiver.id if caregiver else None,
                    },
                )
                measurement_count += 1

        self.stdout.write(f"  [Measurements] Created {measurement_count} measurements")

        # ── Attendance — last 30 days ─────────────────────────────
        from attendance.models import Attendance, AttendanceStatus

        att_count = 0
        for child in all_children:
            for day_offset in range(30):
                day = date.today() - timedelta(days=day_offset)
                if day.weekday() >= 5:
                    continue  # skip weekends
                present = random.random() > 0.15
                Attendance.objects.get_or_create(
                    child=child,
                    date=day,
                    defaults={
                        "status":         AttendanceStatus.PRESENT if present else AttendanceStatus.ABSENT,
                        "absence_reason": "" if present else random.choice(["Sick", "Family", "Transport"]),
                        "recorded_by":    caregiver.id if caregiver else None,
                    },
                )
                att_count += 1
        self.stdout.write(f"  [Attendance] Created {att_count} attendance records")

        # ── Referrals for malnourished children ──────────────────
        from referrals.models import Referral

        ref_children = [c for c in all_children if c.full_name in
                        ("Grace Mukamana", "Christian Mugisha", "Patrick Nzeyimana")]
        ref_count = 0
        for child in ref_children:
            Referral.objects.get_or_create(
                child=child,
                referral_date=date.today() - timedelta(days=random.randint(5, 30)),
                defaults={
                    "reason":             "Suspected malnutrition — requires clinical assessment",
                    "health_centre_name": random.choice(["Kibagabaga Hospital", "CHUK", "Kicukiro Health Centre"]),
                    "status":             random.choice(["pending", "attended"]),
                    "referred_by":        caregiver.id if caregiver else None,
                },
            )
            ref_count += 1
        self.stdout.write(f"  [Referrals] Created {ref_count} referrals")

        # ── Alerts from measurements ──────────────────────────────
        from alerts.models import Alert, AlertType, AlertSeverity, AlertStatus

        alert_count = 0
        for child in all_children:
            last_m = Measurement.objects.filter(child=child).order_by("-recorded_at").first()
            if last_m and last_m.nutritional_status in ("sam", "mam"):
                atype = AlertType.SAM_CLASSIFICATION if last_m.nutritional_status == "sam" else AlertType.MAM_CLASSIFICATION
                Alert.objects.get_or_create(
                    child=child,
                    alert_type=atype,
                    status=AlertStatus.ACTIVE,
                    defaults={
                        "centre":           child.centre_id,
                        "severity":         AlertSeverity.URGENT if last_m.nutritional_status == "sam" else AlertSeverity.WARNING,
                        "explanation_en":   f"{child.full_name} is classified as {last_m.nutritional_status.upper()}. Immediate attention needed.",
                        "explanation_rw":   f"{child.full_name} yagaragajwe ko ari mu {last_m.nutritional_status.upper()}. Igitegererezo cy'ihutirwa.",
                        "recommendation_en":"Review feeding practices and refer to health centre.",
                        "recommendation_rw":"Reba imirire hanyuma mujye ku kigo cy'ubuzima.",
                        "trigger_data":     {"measurement_id": str(last_m.id), "status": last_m.nutritional_status},
                        "algorithm_used":   "nutritional_status_classification",
                    },
                )
                alert_count += 1
        self.stdout.write(f"  [Alerts] Created {alert_count} alerts")

        # ── Nutrition Programme Enrolments ────────────────────────
        from nutrition.models import NutritionProgramme

        nut_count = 0
        for child in all_children:
            last_m = Measurement.objects.filter(child=child).order_by("-recorded_at").first()
            if last_m and last_m.nutritional_status in ("sam", "mam"):
                ptype = "tfp" if last_m.nutritional_status == "sam" else "sfp"
                NutritionProgramme.objects.get_or_create(
                    child=child,
                    programme_type=ptype,
                    defaults={
                        "enrolment_date": date.today() - timedelta(days=random.randint(5, 20)),
                        "outcome":        "ongoing",
                        "recorded_by":    caregiver.id if caregiver else None,
                    },
                )
                nut_count += 1
        self.stdout.write(f"  [Nutrition] Created {nut_count} nutrition enrolments")

        self.stdout.write(self.style.SUCCESS(
            f"\n[OK] Demo data seeded successfully!"
            f"\n   {len(centres)} centres, {len(all_children)} children"
            f"\n   Login: caregiver01 / Irerero2025!"
        ))
