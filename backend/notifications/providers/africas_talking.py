# notifications/providers/africas_talking.py
#
# Production SMS provider — Africa's Talking API.
# Primary: MTN Rwanda. Fallback: Airtel Rwanda. Architecture §5.3.
# Activating this provider requires only one settings.py change.

import uuid
from datetime import datetime
from django.conf import settings
from .base import SmsProvider, SmsResult


class AfricasTalkingProvider(SmsProvider):
    """
    Production SMS provider using Africa's Talking API.
    Integrates with MTN Rwanda (primary) and Airtel Rwanda (fallback).
    The API key and username are loaded from environment variables — never hardcoded.
    """

    def __init__(self):
        import africastalking
        africastalking.initialize(
            username=settings.AFRICAS_TALKING_USERNAME,
            api_key=settings.AFRICAS_TALKING_API_KEY,
        )
        self._sms = africastalking.SMS

    def send(self, to: str, message: str, msg_type: str,
             child_id=None, alert_id=None) -> SmsResult:
        from notifications.models import SmsLog, SmsProvider as ProviderChoice

        try:
            response = self._sms.send(message, [to])
            recipients = response.get("SMSMessageData", {}).get("Recipients", [{}])
            first = recipients[0] if recipients else {}

            status     = "delivered" if first.get("status") == "Success" else "failed"
            message_id = first.get("messageId", str(uuid.uuid4()))

            log = SmsLog.objects.create(
                recipient_phone=to,
                message=message,
                msg_type=msg_type,
                provider=ProviderChoice.AFRICAS_TALKING,
                status=status,
                provider_message_id=message_id,
                child_id=child_id,
                alert_id=alert_id,
            )
            return SmsResult(
                success=(status == "delivered"),
                message_id=message_id,
                timestamp=log.sent_at,
            )
        except Exception as exc:
            return SmsResult(
                success=False,
                message_id="",
                timestamp=datetime.now(),
                error_message=str(exc),
            )

    def send_batch(self, recipients: list[str], message: str,
                   msg_type: str) -> list[SmsResult]:
        return [self.send(r, message, msg_type) for r in recipients]
