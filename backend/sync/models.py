# sync/models.py
#
# Sync log — records every bulk upload from mobile devices.
# SRS §8.1 SyncQueue entity (server-side log), FR-082 to FR-089

import uuid
from django.db import models


class SyncLog(models.Model):
    """
    Server-side record of each sync session from a mobile device.
    Used for troubleshooting, audit, and detecting devices that have
    stopped syncing (which could mean the device is lost or damaged).
    """
    id                 = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device_id          = models.CharField(max_length=100)
    user_id            = models.UUIDField()
    synced_at          = models.DateTimeField(auto_now_add=True)
    records_received   = models.IntegerField(default=0)
    records_accepted   = models.IntegerField(default=0)
    records_conflicted = models.IntegerField(default=0)
    ip_address         = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = "sync_log"
        ordering = ["-synced_at"]
