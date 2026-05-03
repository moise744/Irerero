# notifications/providers/base.py
#
# Abstract SMS provider interface.
# Both MockSmsProvider and AfricasTalkingProvider implement this EXACT contract.
# Changing providers requires only one line in settings.py — no other code changes.
# Architecture §3.2.3, §5.2

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class SmsResult:
    """Return type from every send() call — same for mock and real."""
    success:     bool
    message_id:  str
    timestamp:   datetime
    error_message: Optional[str] = None


class SmsProvider(ABC):
    """Abstract base class — all providers must implement these two methods."""

    @abstractmethod
    def send(self, to: str, message: str, msg_type: str,
             child_id=None, alert_id=None) -> SmsResult:
        """
        Send a single SMS.

        Args:
            to:       Recipient phone in E.164 format, e.g. +250788123456
            message:  Plain text message, max 160 chars per part
            msg_type: One of SmsType choices (e.g. 'sam_alert', 'referral_created')
            child_id: Optional UUID of the related child record
            alert_id: Optional UUID of the related alert record

        Returns:
            SmsResult with success flag and provider message ID
        """
        ...

    @abstractmethod
    def send_batch(self, recipients: list[str], message: str,
                   msg_type: str) -> list[SmsResult]:
        """
        Send the same message to multiple recipients simultaneously — FR-081.
        """
        ...
