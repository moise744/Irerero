from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def home(request):
    return JsonResponse({
        "message": "Irerero Backend is running",
        "available_routes": {
            "admin": "/admin/",
            "health": "/health/",
            "api_base": "/api/v1/",
            "auth": "/api/v1/auth/",
            "users": "/api/v1/users/",
            "children": "/api/v1/children/",
            "measurements": "/api/v1/measurements/",
            "alerts": "/api/v1/alerts/",
            "attendance": "/api/v1/attendance/",
            "nutrition": "/api/v1/nutrition/",
            "referrals": "/api/v1/referrals/",
            "reports": "/api/v1/reports/",
            "sync": "/api/v1/sync/",
            "notifications": "/api/v1/notifications/",
            "ai": "/api/v1/ai/retrain/"
        }
    })

urlpatterns = [
    path("", home),
    path("admin/", admin.site.urls),
    path("health/", include("sync.health_urls")),
    path("api/v1/", include([
        path("auth/",         include("auth_module.urls")),
        path("users/",        include("auth_module.user_urls")),
        path("children/",     include("children.urls")),
        path("measurements/", include("measurements.urls")),
        path("alerts/",       include("alerts.urls")),
        path("attendance/",   include("attendance.urls")),
        path("nutrition/",    include("nutrition.urls")),
        path("referrals/",    include("referrals.urls")),
        path("reports/",      include("reports.urls")),
        path("sync/",         include("sync.urls")),
        path("notifications/", include("notifications.urls")),
        path("ai/retrain/",   __import__('ai.views', fromlist=['MLRetrainView']).MLRetrainView.as_view(), name="ml-retrain"),
    ])),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)