# notifications/consumers.py
#
# WebSocket consumers that push real-time alerts and SMS log
# entries to the web dashboard — architecture §5.4, SRS §3.2.4

import json
from channels.generic.websocket import AsyncWebsocketConsumer


class AlertConsumer(AsyncWebsocketConsumer):
    """
    ws/alerts/
    Pushes new alert records to connected dashboard clients in real-time.
    Any Celery task that generates an alert sends to the 'alerts' group.
    """
    group_name = "alerts"

    async def connect(self):
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def alert_new(self, event):
        """Receives a new alert event from the Celery layer and sends to dashboard."""
        await self.send(text_data=json.dumps(event["data"]))


class SmsLogConsumer(AsyncWebsocketConsumer):
    """
    ws/sms-log/
    Pushes new SMS log entries to the dashboard SMS Inbox in real-time.
    MockSmsProvider sends to this group after writing to the database.
    """
    group_name = "sms_log"

    async def connect(self):
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def sms_new(self, event):
        """Receives a new SMS log event and sends to dashboard."""
        await self.send(text_data=json.dumps(event["data"]))
