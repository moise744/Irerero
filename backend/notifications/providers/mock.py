# notifications/providers/mock.py
#
# Mock SMS provider for development and demonstration.
# Writes every message to the sms_log database table.
# Pushes a real-time WebSocket event to the dashboard SMS Inbox.
# Zero external dependencies — works with no internet, no API key.
# Architecture §3.2.3

import uuid
from datetime import datetime
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .base import SmsProvider, SmsResult


class MockSmsProvider(SmsProvider):
    """
    Demo SMS provider — used in development and project demonstration.
    Every SMS appears in the web dashboard SMS Inbox panel within seconds.
    The evaluator can trigger an alert and watch the simulated SMS arrive live.
    """

    def send(self, to: str, message: str, msg_type: str,
             child_id=None, alert_id=None) -> SmsResult:
        from notifications.models import SmsLog, SmsProvider as ProviderChoice

        # Write to database
        log = SmsLog.objects.create(
            recipient_phone=to,
            message=message,
            msg_type=msg_type,
            provider=ProviderChoice.MOCK,
            status="delivered",
            child_id=child_id,
            alert_id=alert_id,
        )

        # Push to WebSocket → dashboard SMS Inbox in real-time
        self._push_to_dashboard(log)

        return SmsResult(
            success=True,
            message_id=str(log.id),
            timestamp=log.sent_at,
        )

    def send_batch(self, recipients: list[str], message: str,
                   msg_type: str) -> list[SmsResult]:
        return [self.send(r, message, msg_type) for r in recipients]

    def _push_to_dashboard(self, log):
        """Send a WebSocket event to the sms_log group — dashboard picks it up."""
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "sms_log",
                {
                    "type": "sms.new",
                    "data": {
                        "id":        str(log.id),
                        "to":        log.recipient_phone,
                        "message":   log.message,
                        "msg_type":  log.msg_type,
                        "sent_at":   log.sent_at.isoformat(),
                        "provider":  "mock",
                        "status":    "delivered",
                    },
                }
            )
        except Exception:
            pass  # WebSocket push is best-effort — SMS log is already written
