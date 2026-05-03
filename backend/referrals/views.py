# referrals/views.py
from pathlib import Path

from django.conf import settings
from django.http import FileResponse
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from auth_module.permissions import ScopedQuerysetMixin, CanCreateReferral
from .models import Referral
from .serializers import ReferralSerializer


class ReferralViewSet(ScopedQuerysetMixin, ModelViewSet):
    """FR-054 to FR-059 — referrals scoped by child centre."""

    queryset = Referral.objects.all()
    scope_field = "child__centre"
    serializer_class = ReferralSerializer
    filterset_fields = ["status", "child"]

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), CanCreateReferral()]
        return [IsAuthenticated()]

    @action(detail=True, methods=["get"], url_path="slip.pdf")
    def slip_pdf(self, request, pk=None):
        """
        GET /api/v1/referrals/{id}/slip.pdf
        Printable referral slip — FR-055.
        """
        from pdf.generator import generate_referral_slip

        referral = self.get_object()
        path = generate_referral_slip(referral)
        full_path = Path(settings.MEDIA_ROOT) / path
        if full_path.exists():
            # If WeasyPrint is unavailable, generator falls back to HTML.
            if str(full_path).lower().endswith(".html"):
                return FileResponse(open(full_path, "rb"), content_type="text/html; charset=utf-8")
            return FileResponse(open(full_path, "rb"), content_type="application/pdf")
        return Response({"detail": "PDF generation failed."}, status=500)
