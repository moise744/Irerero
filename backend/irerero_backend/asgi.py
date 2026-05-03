# irerero_backend/asgi.py
#
# ASGI configuration — handles both HTTP and WebSocket connections.
# WebSocket endpoints push real-time alerts and SMS log updates
# to the web dashboard (architecture §5.4).

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "irerero_backend.settings")

django_asgi_app = get_asgi_application()

from notifications import routing as notif_routing

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(notif_routing.websocket_urlpatterns)
        )
    ),
})
