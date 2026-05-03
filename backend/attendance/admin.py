# attendance/admin.py
from django.contrib import admin
from .models import Attendance

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ["child", "date", "status", "absence_reason"]
    list_filter = ["status", "date"]
    search_fields = ["child__full_name"]
