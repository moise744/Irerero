# pdf/generator.py - PDF generation for referral slips, child reports, monthly reports
import os
from pathlib import Path
from django.template.loader import render_to_string
from django.conf import settings


def _child_photo_file_uri(child) -> str | None:
    """WeasyPrint resolves images best from file:// URIs when rendering from an HTML string."""
    if not getattr(child, "photo", None) or not child.photo:
        return None
    try:
        p = Path(child.photo.path).resolve()
        if p.is_file():
            return p.as_uri()
    except Exception:
        pass
    return None


def _save_pdf(html_content: str, filename: str) -> str:
    """Render HTML to PDF using WeasyPrint and save to media directory."""
    try:
        from weasyprint import HTML
        media_dir = Path(settings.MEDIA_ROOT) / "pdfs"
        media_dir.mkdir(parents=True, exist_ok=True)
        output_path = media_dir / filename
        HTML(string=html_content, base_url=str(settings.BASE_DIR)).write_pdf(str(output_path))
        return f"pdfs/{filename}"
    except Exception:
        # WeasyPrint may fail on some server environments (e.g. missing GTK/Pango
        # libraries on Windows, or Python 3.14 incompatibilities with older releases).
        # Fall back to saving HTML so the slip/report is still printable/viewable.
        media_dir = Path(settings.MEDIA_ROOT) / "pdfs"
        media_dir.mkdir(parents=True, exist_ok=True)
        html_path = media_dir / filename.replace(".pdf", ".html")
        html_path.write_text(html_content, encoding="utf-8")
        return f"pdfs/{filename.replace('.pdf', '.html')}"


def generate_referral_slip(referral) -> str:
    """Generate printable PDF referral slip - FR-055."""
    from measurements.models import Measurement
    child = referral.child
    last_m = Measurement.objects.filter(child=child).order_by("-recorded_at").first()
    context = {
        "child_name": child.full_name,
        "irerero_id": child.irerero_id,
        "date_of_birth": child.date_of_birth.strftime("%d %B %Y"),
        "age_months": child.age_in_months,
        "sex": child.sex.capitalize(),
        "guardian_name": child.guardian_name,
        "guardian_phone": child.guardian_phone,
        "centre_name": child.centre.centre_name,
        "referral_date": referral.referral_date.strftime("%d %B %Y"),
        "reason": referral.reason,
        "referred_by_name": "ECD Caregiver",
        "weight_kg": str(last_m.weight_kg) if last_m and last_m.weight_kg else "—",
        "height_cm": str(last_m.height_cm) if last_m and last_m.height_cm else "—",
        "muac_cm": str(last_m.muac_cm) if last_m and last_m.muac_cm else "—",
        "nutritional_status": last_m.get_nutritional_status_display() if last_m else "—",
        "measurement_date": last_m.recorded_at.strftime("%d %B %Y") if last_m else "—",
        "is_sam": bool(last_m and last_m.nutritional_status == "sam"),
    }
    html = render_to_string("referral_slip.html", context)
    filename = f"referral_{referral.id}.pdf"
    path = _save_pdf(html, filename)
    referral.referral_slip_url = path
    referral.save(update_fields=["referral_slip_url"])
    return path


def generate_child_growth_report(child) -> str:
    """Generate individual child growth report on demand - FR-072."""
    from measurements.models import Measurement
    from alerts.models import Alert
    from referrals.models import Referral
    from ai.classification import STATUS_LABEL_EN
    from django.utils import timezone

    measurements = Measurement.objects.filter(child=child, deleted_at__isnull=True).order_by("-recorded_at")[:24]
    alerts = Alert.objects.filter(child=child).order_by("-generated_at")[:10]
    referrals = Referral.objects.filter(child=child).order_by("-referral_date")[:10]
    last_m = measurements.first()
    current_status = last_m.nutritional_status if last_m else "normal"

    context = {
        "child_name": child.full_name,
        "irerero_id": child.irerero_id,
        "date_of_birth": child.date_of_birth.strftime("%d %B %Y"),
        "age_months": child.age_in_months,
        "sex": child.sex.capitalize(),
        "guardian_name": child.guardian_name,
        "guardian_phone": child.guardian_phone,
        "centre_name": child.centre.centre_name,
        "photo_uri": _child_photo_file_uri(child),
        "current_status": current_status,
        "current_status_label": STATUS_LABEL_EN.get(current_status, current_status),
        "generated_date": timezone.now().strftime("%d %B %Y"),
        "measurements": [{"date": m.recorded_at.strftime("%Y-%m-%d"), "weight_kg": str(m.weight_kg) if m.weight_kg else "—", "height_cm": str(m.height_cm) if m.height_cm else "—", "muac_cm": str(m.muac_cm) if m.muac_cm else "—", "temperature_c": str(m.temperature_c) if m.temperature_c else "—", "status": m.nutritional_status, "source": m.source} for m in measurements],
        "alerts": [{"date": a.generated_at.strftime("%Y-%m-%d"), "explanation": a.explanation_en, "severity": a.severity, "status": a.status} for a in alerts],
        "referrals": [{"date": r.referral_date.strftime("%Y-%m-%d"), "reason": r.reason, "health_centre": r.health_centre_name, "status": r.status, "outcome": r.diagnosis or "Pending"} for r in referrals],
    }
    html = render_to_string("child_growth_report.html", context)
    return _save_pdf(html, f"growth_report_{child.id}.pdf")


def generate_monthly_report_pdf(report) -> str:
    """Generate monthly centre report as PDF - FR-073."""
    import calendar
    data = report.data
    month_name = calendar.month_name[report.month]
    status_labels = {"normal": "Normal", "at_risk": "At Risk", "mam": "MAM", "sam": "SAM", "stunted": "Stunted", "severely_stunted": "Severely Stunted", "underweight": "Underweight", "unmeasured": "Not Yet Measured"}
    total = data.get("total_enrolled", 0)
    status_rows = [{"label": label, "count": data.get("nutritional_status", {}).get(key, 0), "percent": round(data.get("nutritional_status", {}).get(key, 0) / total * 100, 1) if total > 0 else 0} for key, label in status_labels.items()]
    context = {
        "centre_name": str(report.centre), "month_name": month_name, "year": report.year,
        "status": report.status, "total_enrolled": total,
        "total_enrolled_male": data.get("total_enrolled_male", 0),
        "total_enrolled_female": data.get("total_enrolled_female", 0),
        "status_rows": status_rows,
        "new_sam_cases": data.get("new_sam_cases", 0),
        "new_mam_cases": data.get("new_mam_cases", 0),
        "total_referrals": data.get("total_referrals", 0),
        "children_in_nutrition": data.get("children_in_nutrition", 0),
        "manager_notes": report.manager_notes,
        "approved_by": str(report.approved_by) if report.approved_by else None,
        "approved_at": report.approved_at.strftime("%d %B %Y") if report.approved_at else None,
        "submitted_at": report.submitted_at.strftime("%d %B %Y") if report.submitted_at else None,
    }
    html = render_to_string("monthly_report.html", context)
    return _save_pdf(html, f"monthly_{report.centre}_{report.year}_{report.month:02d}.pdf")
