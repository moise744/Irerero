# alerts/admin.py — Register Alert model with Django admin
from django.contrib import admin
from .models import Alert


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ["child", "alert_type", "severity", "status", "generated_at"]
    search_fields = ["child__full_name", "explanation_en"]
    list_filter = ["severity", "status", "alert_type"]
    readonly_fields = ["trigger_data", "shap_explanation"]
