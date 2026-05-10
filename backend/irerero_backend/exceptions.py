# irerero_backend/exceptions.py
#
# RFC 7807 Problem Details error handler — architecture §3.2.1
# All API errors return a consistent JSON structure so mobile clients
# and the web dashboard can handle them uniformly.
# P4 FIX: Global 500 handler prevents internal details from leaking.

from rest_framework.views import exception_handler
from rest_framework.response import Response
import logging

logger = logging.getLogger(__name__)


def problem_detail_handler(exc, context):
    """
    Wraps DRF's default exception handler to return RFC 7807
    Problem Details format on every error response.
    P4: Never expose internal server details in error messages.

    Example output:
        {
            "type": "about:blank",
            "title": "Not Found",
            "status": 404,
            "detail": "No child found with id GIT-2025-9999."
        }
    """
    response = exception_handler(exc, context)

    if response is not None:
        detail = _extract_detail(response.data)
        # P4 Security: Sanitize any internal info that may have leaked
        detail = _sanitize_error_detail(detail)
        problem = {
            "type": "about:blank",
            "title": response.status_text,
            "status": response.status_code,
            "detail": detail,
        }
        return Response(problem, status=response.status_code,
                        content_type="application/problem+json")

    # Unhandled exceptions (500) — log internally, return generic message
    if exc is not None:
        logger.error("Unhandled exception in API view", exc_info=exc)
    return response


def _extract_detail(data):
    """Pull a flat string out of whatever DRF put in response.data."""
    if isinstance(data, str):
        return data
    if isinstance(data, list):
        return " ".join(str(item) for item in data)
    if isinstance(data, dict):
        parts = []
        for value in data.values():
            parts.append(_extract_detail(value))
        return " ".join(parts)
    return str(data)


# Keywords that must never appear in user-facing error messages
_SENSITIVE_KEYWORDS = [
    "python manage.py", "seed_demo_data", "traceback", "django.db",
    "psycopg", "sqlite", "secret_key", "settings.", "Traceback",
    "File \"", "line ", "Exception", "Error at /",
]


def _sanitize_error_detail(detail: str) -> str:
    """
    P4 Security fix: Replace error messages that contain internal
    server details with a safe generic message.
    """
    detail_lower = detail.lower()
    for keyword in _SENSITIVE_KEYWORDS:
        if keyword.lower() in detail_lower:
            logger.warning("Sanitized potentially sensitive error detail: %s", detail[:200])
            return "An internal server error occurred. Please try again or contact support."
    return detail


def handler500(request):
    """
    P4: Override Django's default 500 handler to return clean JSON
    instead of the HTML debug page that leaks internal details.
    """
    from django.http import JsonResponse
    logger.error("500 Internal Server Error for path: %s", request.path)
    return JsonResponse(
        {
            "type": "about:blank",
            "title": "Internal Server Error",
            "status": 500,
            "detail": "An internal server error occurred. Please try again or contact support.",
        },
        status=500,
        content_type="application/problem+json",
    )


def handler404(request, exception=None):
    """Return clean JSON 404 for all API paths."""
    from django.http import JsonResponse
    if request.path.startswith("/api/"):
        return JsonResponse(
            {"type": "about:blank", "title": "Not Found", "status": 404,
             "detail": "The requested resource was not found."},
            status=404,
            content_type="application/problem+json",
        )
    # For non-API paths fall through to Django's default HTML 404
    from django.views.defaults import page_not_found
    return page_not_found(request, exception)

