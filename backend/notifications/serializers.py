# notifications/serializers.py
from rest_framework import serializers
from .models import SmsLog


class SmsLogSerializer(serializers.ModelSerializer):
    """
    SMS Inbox serializer — read by web dashboard SMS Inbox panel.
    FR-080: log of all SMS sent with recipient, content, date/time, status.
    """
    class Meta:
        model  = SmsLog
        fields = ["id", "recipient_phone", "message", "msg_type",
                  "sent_at", "provider", "status", "child_id", "alert_id"]
