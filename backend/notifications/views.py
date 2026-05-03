# notifications/views.py
#
# SMS log endpoint for web dashboard SMS Inbox panel.
# GET /api/v1/notifications/sms-log/ — FR-080
# POST /api/v1/notifications/sms/batch/ — FR-081

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ReadOnlyModelViewSet

from .models import SmsLog
from .serializers import SmsLogSerializer
from .providers import get_sms_provider


class SmsLogViewSet(ReadOnlyModelViewSet):
    """
    GET /api/v1/notifications/sms-log/
    Returns all SMS messages ordered by most recent — dashboard SMS Inbox.
    FR-080.
    """
    queryset         = SmsLog.objects.all().order_by("-sent_at")
    serializer_class = SmsLogSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["msg_type", "status", "provider"]


class BatchSmsView(APIView):
    """
    POST /api/v1/notifications/sms/batch/
    Sends the same message to multiple parent phone numbers simultaneously.
    FR-081.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        recipients = request.data.get("recipients", [])
        message    = request.data.get("message", "")
        msg_type   = request.data.get("msg_type", "batch_reminder")

        if not recipients or not message:
            return Response({"detail": "recipients and message are required."}, status=400)

        provider = get_sms_provider()
        results  = provider.send_batch(recipients, message, msg_type)

        return Response({
            "sent":   sum(1 for r in results if r.success),
            "failed": sum(1 for r in results if not r.success),
            "total":  len(results),
        })
