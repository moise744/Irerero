# notifications/providers/__init__.py
#
# SMS Provider factory — returns the configured provider instance.
# Changing SMS_PROVIDER in settings.py is the ONLY change needed to go live.
# Architecture §3.2.3

from django.conf import settings


def get_sms_provider():
    """
    Returns the active SmsProvider implementation.
    Settings value 'mock' → MockSmsProvider (development/demo)
    Settings value 'africas_talking' → AfricasTalkingProvider (production)
    """
    provider_name = getattr(settings, "SMS_PROVIDER", "mock")
    if provider_name == "africas_talking":
        from .africas_talking import AfricasTalkingProvider
        return AfricasTalkingProvider()
    from .mock import MockSmsProvider
    return MockSmsProvider()
