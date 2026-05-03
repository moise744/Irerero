# notifications/models.py
#
# SMS log — every outbound message is stored here regardless of provider.
# The dashboard SMS Inbox reads from this table via WebSocket.
# FCM push notifications also tracked here.
# FR-076 to FR-081, SRS §3.2.3, §3.2.4

import uuid
from django.db import models


class SmsType(models.TextChoices):
    SAM_ALERT         = "sam_alert",         "SAM Alert"
    REFERRAL_CREATED  = "referral_created",  "Referral Created"
    WEEKLY_PROGRESS   = "weekly_progress",   "Weekly Progress Update"
    ABSENCE_FOLLOWUP  = "absence_followup",  "Absence Follow-up"
    BATCH_REMINDER    = "batch_reminder",    "Batch Reminder"


class SmsStatus(models.TextChoices):
    DELIVERED = "delivered", "Delivered"
    FAILED    = "failed",    "Failed"
    PENDING   = "pending",   "Pending"


class SmsProvider(models.TextChoices):
    MOCK            = "mock",            "Mock Provider (Demo)"
    AFRICAS_TALKING = "africas_talking", "Africa's Talking (Production)"


class SmsLog(models.Model):
    """
    Record of every SMS sent by the system.
    MockSmsProvider writes here AND pushes via WebSocket to the dashboard.
    AfricasTalkingProvider writes here after the real API call succeeds or fails.
    FR-080, SRS §3.2.3.
    SMS logs retained 2 years — SRS §8.2.
    """
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient_phone = models.CharField(max_length=20)
    message        = models.TextField()
    msg_type       = models.CharField(max_length=25, choices=SmsType.choices)
    sent_at        = models.DateTimeField(auto_now_add=True)
    provider       = models.CharField(max_length=20, choices=SmsProvider.choices)
    status         = models.CharField(max_length=15, choices=SmsStatus.choices,
                                      default=SmsStatus.PENDING)
    provider_message_id = models.CharField(max_length=100, blank=True)
    error_message  = models.TextField(blank=True)

    # Optional links back to source records
    child_id       = models.UUIDField(null=True, blank=True)
    alert_id       = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = "sms_log"
        ordering = ["-sent_at"]

    def __str__(self):
        return f"SMS to {self.recipient_phone} ({self.msg_type}) — {self.status}"


class FcmNotification(models.Model):
    """
    Push notification record — FR-079.
    Notification preview text NEVER includes sensitive child data — SRS §9.4.
    """
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id      = models.UUIDField()
    device_token = models.TextField()
    title        = models.CharField(max_length=200)
    body         = models.CharField(max_length=200)   # safe preview text only
    data         = models.JSONField(default=dict)     # full data delivered inside app
    sent_at      = models.DateTimeField(auto_now_add=True)
    status       = models.CharField(max_length=20, default="sent")

    class Meta:
        db_table = "fcm_notifications"
        ordering = ["-sent_at"]
