# irerero_backend/exceptions.py
#
# RFC 7807 Problem Details error handler — architecture §3.2.1
# All API errors return a consistent JSON structure so mobile clients
# and the web dashboard can handle them uniformly.

from rest_framework.views import exception_handler
from rest_framework.response import Response


def problem_detail_handler(exc, context):
    """
    Wraps DRF's default exception handler to return RFC 7807
    Problem Details format on every error response.

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
        problem = {
            "type": "about:blank",
            "title": response.status_text,
            "status": response.status_code,
            "detail": _extract_detail(response.data),
        }
        return Response(problem, status=response.status_code,
                        content_type="application/problem+json")

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
