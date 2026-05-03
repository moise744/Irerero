# reports/admin.py
from django.contrib import admin
from .models import MonthlyReport

@admin.register(MonthlyReport)
class MonthlyReportAdmin(admin.ModelAdmin):
    list_display = ["centre", "month", "year", "status"]
    list_filter = ["status", "year"]
