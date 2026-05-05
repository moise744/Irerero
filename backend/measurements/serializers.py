# measurements/serializers.py
#
# Measurement input validation and Z-score computation.
# BIV validation runs on both manual and embedded device input — FR-025, ES-FR-007.

from decimal import Decimal
from rest_framework import serializers
from django.utils import timezone
from .models import Measurement, NutritionalStatus, MeasurementSource
from auth_module.models import Role


class RecordMeasurementSerializer(serializers.ModelSerializer):
    """
    Validates and saves a new measurement.
    Z-scores are computed server-side after sync as a verification step.
    BIV warnings are returned to the caller — the mobile app shows them to the caregiver.
    FR-019 to FR-027.
    """
    class Meta:
        model  = Measurement
        fields = [
            "child", "weight_kg", "height_cm", "muac_cm",
            "temperature_c", "head_circ_cm",
            "measurement_position", "source", "device_id",
            "recorded_at",
        ]

    def validate_weight_kg(self, value):
        if value is not None and (value < Decimal("0.5") or value > Decimal("300")):
            raise serializers.ValidationError(
                "Weight seems outside a plausible range. "
                "Please check the value and confirm before saving."
            )
        return value

    def validate_height_cm(self, value):
        if value is not None and (value < Decimal("20") or value > Decimal("250")):
            raise serializers.ValidationError(
                "Height seems outside a plausible range. "
                "Please check the value and confirm before saving."
            )
        return value

    def validate_temperature_c(self, value):
        """Temperature alert thresholds from PUD §3.4."""
        if value is not None and (value < Decimal("25") or value > Decimal("45")):
            raise serializers.ValidationError(
                "Temperature reading seems implausible. "
                "Please retake the measurement."
            )
        return value

    def validate_muac_cm(self, value):
        if value is not None and (value < Decimal("5") or value > Decimal("50")):
            raise serializers.ValidationError(
                "MUAC reading seems outside a plausible range."
            )
        return value

    def create(self, validated_data):
        from ai.zscore import compute_all_zscores, classify_nutritional_status
        child       = validated_data["child"]
        age_months  = child.age_in_months
        weight      = validated_data.get("weight_kg")
        height      = validated_data.get("height_cm")
        muac        = validated_data.get("muac_cm")

        # Compute Z-scores
        z_result = compute_all_zscores(
            weight_kg=float(weight) if weight else None,
            height_cm=float(height) if height else None,
            muac_cm=float(muac) if muac else None,
            age_months=age_months,
            sex=child.sex,
        )

        # Classify nutritional status
        status = classify_nutritional_status(
            waz=z_result["waz"],
            haz=z_result["haz"],
            whz=z_result["whz"],
            muac_cm=float(muac) if muac else None,
        )

        measurement = Measurement.objects.create(
            **validated_data,
            waz_score=z_result["waz"],
            haz_score=z_result["haz"],
            whz_score=z_result["whz"],
            nutritional_status=status,
            biv_flagged=z_result["biv_flagged"],
            recorded_by=self.context["request"].user.id,
        )
        return measurement


class MeasurementSerializer(serializers.ModelSerializer):
    """Read-only measurement serializer for history and profile views."""
    nutritional_status_display = serializers.CharField(
        source="get_nutritional_status_display", read_only=True
    )
    child_name = serializers.CharField(source="child.full_name", read_only=True)

    class Meta:
        model  = Measurement
        fields = [
            "id", "child", "child_name",
            "weight_kg", "height_cm", "muac_cm", "temperature_c", "head_circ_cm",
            "measurement_position",
            "waz_score", "haz_score", "whz_score",
            "nutritional_status", "nutritional_status_display",
            "biv_flagged", "biv_confirmed",
            "source", "device_id",
            "recorded_by", "recorded_at",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        if request and request.user.role == Role.PARTNER:
            # GAP-004: Anonymize child name for partner
            data["child_name"] = "Anonymised"
        return data
