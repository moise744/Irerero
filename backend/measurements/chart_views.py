# measurements/chart_views.py
#
# Growth chart data endpoint.
# Returns measurement history formatted for chart rendering.
# Flutter uses this for fl_chart with WHO P3/P15/P50/P85/P97 reference lines.
# Web dashboard uses this for Recharts rendering.
# FR-024.

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from children.models import Child
from .models import Measurement


# WHO percentile reference values (simplified lookup for P3, P15, P50, P85, P97)
# Full LMS-derived values loaded from config — these are fallback approximates
# for weight-for-age in kg for boys, shown as chart reference lines.
# The actual implementation uses the LMS tables from lms_data/ — NFR-026.
WHO_REFERENCE_PERCENTILES = {
    "p3":  [3.0, 4.5, 5.5, 6.2, 6.9, 7.5, 8.0, 8.5, 8.9, 9.2, 9.5, 9.8, 10.0],
    "p15": [3.4, 5.0, 6.2, 7.0, 7.7, 8.3, 8.9, 9.4, 9.8, 10.2, 10.5, 10.8, 11.1],
    "p50": [3.9, 5.7, 7.0, 7.9, 8.6, 9.3, 9.9, 10.5, 10.9, 11.3, 11.7, 12.0, 12.3],
    "p85": [4.4, 6.5, 7.9, 9.0, 9.8, 10.6, 11.2, 11.8, 12.4, 12.8, 13.2, 13.6, 14.0],
    "p97": [4.9, 7.2, 8.7, 9.9, 10.8, 11.7, 12.4, 13.1, 13.7, 14.2, 14.7, 15.1, 15.5],
}


class GrowthChartView(APIView):
    """
    GET /api/v1/measurements/{child_id}/growth-chart/
    Returns measurement history plus WHO reference percentile lines
    so the client can render the growth chart without additional API calls.
    FR-024, AI-FR-009.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, child_id):
        try:
            child = Child.objects.get(id=child_id)
        except Child.DoesNotExist:
            return Response({"detail": "Child not found."}, status=404)

        measurements = Measurement.objects.filter(
            child=child,
            deleted_at__isnull=True,
        ).order_by("recorded_at")

        # Build measurement series
        weight_series = []
        height_series = []
        muac_series   = []
        trend_data    = []

        for m in measurements:
            point = {
                "date":          m.recorded_at.date().isoformat(),
                "age_months":    child.age_in_months,
                "nutritional_status": m.nutritional_status,
                "biv_flagged":   m.biv_flagged,
            }
            if m.weight_kg:
                weight_series.append({**point, "value": float(m.weight_kg)})
            if m.height_cm:
                height_series.append({**point, "value": float(m.height_cm)})
            if m.muac_cm:
                muac_series.append({**point, "value": float(m.muac_cm)})

        # Linear regression trend line — AI-FR-009
        if len(weight_series) >= 3:
            trend_data = self._compute_trend_line(weight_series)

        return Response({
            "child_id":     str(child.id),
            "child_name":   child.full_name,
            "sex":          child.sex,
            "dob":          child.date_of_birth.isoformat(),
            "weight_series": weight_series,
            "height_series": height_series,
            "muac_series":   muac_series,
            "trend_projection": trend_data,
            "who_reference": WHO_REFERENCE_PERCENTILES,
        })

    def _compute_trend_line(self, series: list) -> list:
        """
        Fit a linear regression line to the weight data and project
        one measurement cycle forward — AI-FR-009.
        """
        if len(series) < 3:
            return []

        xs = list(range(len(series)))
        ys = [p["value"] for p in series]
        n  = len(xs)

        x_m = sum(xs) / n
        y_m = sum(ys) / n
        num = sum((x - x_m) * (y - y_m) for x, y in zip(xs, ys))
        den = sum((x - x_m) ** 2 for x in xs)

        if den == 0:
            return []

        slope = num / den
        intercept = y_m - slope * x_m

        # Trend line points + one projection
        trend = []
        for i in range(n + 1):
            trend.append({
                "index":    i,
                "value":    round(intercept + slope * i, 3),
                "projected": i == n,
            })
        return trend
