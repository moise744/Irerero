# measurements/admin.py — Register measurement models with Django admin
from django.contrib import admin
from .models import Measurement
from .milestone_models import Milestone, Immunisation


@admin.register(Measurement)
class MeasurementAdmin(admin.ModelAdmin):
    list_display = ["child", "weight_kg", "height_cm", "muac_cm", "nutritional_status", "recorded_at", "source"]
    search_fields = ["child__full_name", "child__irerero_id"]
    list_filter = ["nutritional_status", "source", "biv_flagged"]
    readonly_fields = ["waz_score", "haz_score", "whz_score"]


@admin.register(Milestone)
class MilestoneAdmin(admin.ModelAdmin):
    list_display = ["child", "age_band", "milestone_item", "achieved", "assessed_at"]
    list_filter = ["age_band", "achieved"]


@admin.register(Immunisation)
class ImmunisationAdmin(admin.ModelAdmin):
    list_display = ["child", "vaccine_name", "scheduled_date", "status"]
    list_filter = ["status", "vaccine_name"]
