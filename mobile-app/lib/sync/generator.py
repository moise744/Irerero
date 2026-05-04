# pdf/generator.py
#
# PDF Generation Service using WeasyPrint.
# Generates Referral Slips, Growth Reports, and Monthly Summaries.
# FR-054, FR-072, FR-073.

import os
from django.conf import settings
from django.template.loader import render_to_string
from weasyprint import HTML
from pathlib import Path

def generate_referral_slip(referral):
    """
    Generates a PDF referral slip for a parent to take to a health centre.
    User Role 1, Task 17.
    """
    context = {
        "system_name": settings.SYSTEM_NAME,
        "referral": referral,
        "child": referral.child,
        "generated_at": referral.created_at,
    }
    html_content = render_to_string("pdf_templates/referral_slip.html", context)
    
    filename = f"referral_{referral.id}.pdf"
    output_path = Path(settings.MEDIA_ROOT) / "referrals" / filename
    os.makedirs(output_path.parent, exist_ok=True)
    
    HTML(string=html_content).write_pdf(str(output_path))
    return f"referrals/{filename}"

def generate_child_growth_report(child):
    """
    Generates a comprehensive growth report with Z-score trends.
    FR-072.
    """
    measurements = child.measurements.all().order_by("-recorded_at")[:12]
    context = {
        "system_name": settings.SYSTEM_NAME,
        "child": child,
        "measurements": measurements,
        "latest_status": measurements[0].get_nutritional_status_display() if measurements else "N/A"
    }
    html_content = render_to_string("pdf_templates/growth_report.html", context)
    
    filename = f"growth_report_{child.id}.pdf"
    output_path = Path(settings.MEDIA_ROOT) / "reports" / "children" / filename
    os.makedirs(output_path.parent, exist_ok=True)
    
    HTML(string=html_content).write_pdf(str(output_path))
    return f"reports/children/{filename}"

def generate_monthly_report_pdf(report):
    """
    Generates the official monthly centre report for submission to the sector.
    FR-073.
    """
    from children.models import Centre
    centre = Centre.objects.get(id=report.centre)
    
    context = {
        "system_name": settings.SYSTEM_NAME,
        "report": report,
        "centre": centre,
        "metrics": report.data,
        "year": report.year,
        "month_name": report.get_month_display()
    }
    html_content = render_to_string("pdf_templates/monthly_report.html", context)
    
    filename = f"monthly_report_{report.id}.pdf"
    output_path = Path(settings.MEDIA_ROOT) / "reports" / "monthly" / filename
    os.makedirs(output_path.parent, exist_ok=True)
    
    HTML(string=html_content).write_pdf(str(output_path))
    return f"reports/monthly/{filename}"