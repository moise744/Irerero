# children/serializers.py
#
# Serializers for Child and Centre models.
# Sensitive fields (HIV exposure, disability) hidden from Caregiver/CHW — FR-017.

from rest_framework import serializers
from .models import Child, Centre
from auth_module.models import Role


class CentreSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Centre
        fields = ["id", "code", "centre_name", "sector_id", "district_id",
                  "province", "gps_latitude", "gps_longitude"]


class ChildListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for the child register list — FR-015."""
    age_months     = serializers.IntegerField(source="age_in_months", read_only=True)
    centre_name    = serializers.CharField(source="centre.centre_name", read_only=True)
    centre_code    = serializers.CharField(source="centre.code", read_only=True)
    overdue        = serializers.BooleanField(source="is_overdue_for_measurement", read_only=True)

    class Meta:
        model  = Child
        fields = [
            "id", "irerero_id", "full_name", "date_of_birth", "sex",
            "status", "age_months", "centre_name", "centre_code", "overdue",
            "enrolment_date", "photo",
            "guardian_name", "guardian_phone", "home_village",
        ]


class ChildDetailSerializer(serializers.ModelSerializer):
    """
    Full child profile serializer.
    Sensitive fields returned only for Centre Manager and above.
    FR-012, FR-017.
    """
    age_months  = serializers.IntegerField(source="age_in_months", read_only=True)
    centre_name = serializers.CharField(source="centre.centre_name", read_only=True)

    class Meta:
        model  = Child
        fields = [
            "id", "irerero_id", "centre", "centre_name",
            "full_name", "date_of_birth", "sex",
            "guardian_name", "guardian_phone", "home_village",
            "enrolment_date", "status", "photo", "notes",
            "is_orphan", "has_disability", "hiv_exposure_status", "chronic_conditions",
            "age_months", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "irerero_id", "created_at", "updated_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Hide sensitive fields from Caregiver and CHW — FR-017
        request = self.context.get("request")
        if request and request.user.role in {Role.CAREGIVER, Role.CHW}:
            for field in ["is_orphan", "has_disability", "hiv_exposure_status", "chronic_conditions"]:
                data.pop(field, None)
        return data


class RegisterChildSerializer(serializers.ModelSerializer):
    """
    Validates new child registration.
    FR-009: all mandatory fields required.
    FR-010: age must be 0–8 years.
    """
    class Meta:
        model  = Child
        fields = [
            "centre", "full_name", "date_of_birth", "sex",
            "guardian_name", "guardian_phone", "home_village",
            "enrolment_date", "photo", "notes",
            "is_orphan", "has_disability", "hiv_exposure_status", "chronic_conditions",
        ]

    def validate_date_of_birth(self, value):
        """FR-010: reject children older than 8 years or with future birth dates."""
        from django.utils import timezone
        today = timezone.now().date()
        if value > today:
            raise serializers.ValidationError(
                "Date of birth cannot be in the future."
            )
        age_years = (today - value).days / 365.25
        if age_years > 8:
            raise serializers.ValidationError(
                "Children older than 8 years cannot be registered in Irerero."
            )
        return value

    def validate(self, data):
        """FR-013 duplicate detection: same name + DOB + centre — SRS §8.3."""
        centre     = data.get("centre")
        full_name  = data.get("full_name", "").strip().lower()
        dob        = data.get("date_of_birth")
        existing   = Child.objects.filter(
            centre=centre,
            full_name__iexact=full_name,
            date_of_birth=dob,
            deleted_at__isnull=True,
        ).exists()
        if existing:
            raise serializers.ValidationError(
                "A child with this name and date of birth is already registered at this centre. "
                "Please check with the centre manager before creating a duplicate profile."
            )
        return data
