# sync/admin.py
from django.contrib import admin
from .models import SyncLog

@admin.register(SyncLog)
class SyncLogAdmin(admin.ModelAdmin):
    list_display = ["device_id", "user_id", "synced_at", "records_received", "records_accepted", "records_conflicted"]
    list_filter = ["synced_at"]
