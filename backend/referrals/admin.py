# referrals/admin.py
from django.contrib import admin
from .models import Referral

@admin.register(Referral)
class ReferralAdmin(admin.ModelAdmin):
    list_display = ["child", "referral_date", "health_centre_name", "status"]
    list_filter = ["status"]
    search_fields = ["child__full_name", "health_centre_name"]
