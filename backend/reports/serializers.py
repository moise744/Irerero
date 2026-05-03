from rest_framework import serializers
from .models import MonthlyReport

class MonthlyReportSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MonthlyReport
        fields = ["id", "centre", "month", "year", "data", "status",
                  "manager_notes", "created_at", "approved_at", "submitted_at"]
        read_only_fields = ["id", "created_at", "approved_at", "submitted_at"]
