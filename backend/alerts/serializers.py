# alerts/serializers.py
#
# Alert serializers — read-only for caregivers.
# Caregiver UI shows explanation and recommendation only — AI-FR-017.
# Z-score numbers never exposed to caregiver-facing endpoints.

from rest_framework import serializers
from .models import Alert, AlertSeverity


class AlertSerializer(serializers.ModelSerializer):
    """
    Read serializer for alert list and detail.
    Returns the human-readable colour that the UI maps from severity label.
    The severity field itself stores 'urgent'/'warning'/'information'.
    """
    child_name       = serializers.CharField(source="child.full_name", read_only=True)
    guardian_phone   = serializers.CharField(source="child.guardian_phone", read_only=True)
    severity_colour  = serializers.SerializerMethodField()
    severity_display = serializers.CharField(source="get_severity_display", read_only=True)

    class Meta:
        model  = Alert
        fields = [
            "id", "child", "child_name", "guardian_phone",
            "alert_type", "severity", "severity_display", "severity_colour",
            "explanation_en", "explanation_rw",
            "recommendation_en", "recommendation_rw",
            "generated_at", "status",
            "actioned_by", "actioned_at", "action_taken",
            "consecutive_days_absent",
        ]
        read_only_fields = ["id", "generated_at"]

    def get_severity_colour(self, obj):
        return {
            AlertSeverity.URGENT:      "red",
            AlertSeverity.WARNING:     "yellow",
            AlertSeverity.INFORMATION: "green",
        }.get(obj.severity, "green")


class ActionAlertSerializer(serializers.Serializer):
    """
    Used when a caregiver marks an alert as actioned — FR-040.
    Records who actioned it and what they did.
    """
    action_taken = serializers.CharField(max_length=500)
