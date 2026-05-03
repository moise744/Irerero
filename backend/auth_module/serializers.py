# auth_module/serializers.py
#
# Serializers for authentication, user management, and JWT token handling.
# FR-001, FR-004, FR-005, FR-007, FR-008

from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import IreroUser, AuditLog, Role


class LoginSerializer(serializers.Serializer):
    """
    Handles username+password login with account lockout enforcement.
    FR-001: secure login required.
    FR-005: lock after 5 consecutive failed attempts.
    """
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = IreroUser.objects.filter(username=data["username"]).first()

        if user is None:
            raise serializers.ValidationError(
                "Incorrect username or password. Please try again."
            )

        # Check account lockout — FR-005
        if user.locked_until and user.locked_until > timezone.now():
            remaining = int((user.locked_until - timezone.now()).total_seconds() / 60)
            raise serializers.ValidationError(
                f"This account is locked. Please try again in {remaining} minute(s) "
                f"or reset your password."
            )

        if not user.check_password(data["password"]):
            user.failed_login_count += 1
            if user.failed_login_count >= 5:
                user.locked_until = timezone.now() + timezone.timedelta(minutes=30)
            user.save(update_fields=["failed_login_count", "locked_until"])
            attempts_left = max(0, 5 - user.failed_login_count)
            raise serializers.ValidationError(
                f"Incorrect username or password. "
                f"{attempts_left} attempt(s) remaining before account lock."
            )

        if not user.is_active:
            raise serializers.ValidationError("This account has been deactivated.")

        # Successful login — reset counter
        user.failed_login_count = 0
        user.locked_until = None
        user.last_login = timezone.now()
        user.save(update_fields=["failed_login_count", "locked_until", "last_login"])

        data["user"] = user
        return data


class UserSerializer(serializers.ModelSerializer):
    """
    User profile serializer — used for /auth/me/ and user management.
    Sensitive scope fields included so the mobile app knows what data to sync.
    """
    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model  = IreroUser
        fields = [
            "id", "username", "full_name", "role", "role_display",
            "phone_number", "email", "is_active",
            "centre_id", "sector_id", "district_id",
            "failed_login_count", "last_login",
        ]
        read_only_fields = ["id", "failed_login_count", "last_login"]


class CreateUserSerializer(serializers.ModelSerializer):
    """
    Create or update a user — SysAdmin only (FR-007).
    Password is hashed automatically by the model's set_password().
    """
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model  = IreroUser
        fields = [
            "username", "password", "full_name", "role",
            "phone_number", "email",
            "centre_id", "sector_id", "district_id",
        ]

    def validate_password(self, value):
        # NFR-020: minimum 8 chars, at least one letter and one number
        if not any(c.isalpha() for c in value):
            raise serializers.ValidationError(
                "Password must contain at least one letter."
            )
        if not any(c.isdigit() for c in value):
            raise serializers.ValidationError(
                "Password must contain at least one number."
            )
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = IreroUser(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AuditLog
        fields = "__all__"
        read_only_fields = ["id", "changed_at"]
