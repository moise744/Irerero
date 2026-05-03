# notifications/admin.py
from django.contrib import admin
from .models import SmsLog, FcmNotification

@admin.register(SmsLog)
class SmsLogAdmin(admin.ModelAdmin):
    list_display = ["recipient_phone", "msg_type", "status", "provider", "sent_at"]
    list_filter = ["msg_type", "status", "provider"]

@admin.register(FcmNotification)
class FcmNotificationAdmin(admin.ModelAdmin):
    list_display = ["user_id", "title", "status", "sent_at"]
