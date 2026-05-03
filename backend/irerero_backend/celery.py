# irerero_backend/celery.py
#
# Celery application configuration.
# Workers process: AI trend analysis after sync, weekly SMS dispatch,
# monthly report auto-generation, referral pending checks.

import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "irerero_backend.settings")

app = Celery("irerero")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
