# auth_module/views.py
#
# Authentication endpoints — login, logout, token refresh, user management.
# All endpoints under /api/v1/auth/
# FR-001, FR-004, FR-005, FR-006, FR-007

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import IreroUser, AuditLog, Role
from .permissions import IsSysAdmin
from .serializers import LoginSerializer, UserSerializer, CreateUserSerializer


def _log(user, action, table="users", record_id="", request=None):
    """Helper to write an audit log entry — NFR-022."""
    ip = None
    if request:
        ip = request.META.get("REMOTE_ADDR")
    AuditLog.objects.create(
        user=user, action=action, table_name=table,
        record_id=str(record_id), ip_address=ip
    )


class LoginView(APIView):
    """
    POST /api/v1/auth/login/
    Returns JWT access + refresh token pair.
    Enforces account lockout after 5 failed attempts — FR-005.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)
        _log(user, "auth.login", request=request)

        return Response({
            "access":  str(refresh.access_token),
            "refresh": str(refresh),
            "user":    UserSerializer(user).data,
        })


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/
    Blacklists the refresh token so it cannot be reused.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token_str = request.data.get("refresh")
        if not token_str:
            return Response({"detail": "Refresh token is required."}, status=400)
        try:
            token = RefreshToken(token_str)
            token.blacklist()
        except Exception:
            pass  # Token may already be expired — that is fine
        _log(request.user, "auth.logout", request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """
    GET /api/v1/auth/me/
    Returns the authenticated user's profile and scope information.
    The mobile app uses this to know what data to sync.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        """Allow user to update their own phone number, email, FCM token."""
        allowed_fields = {"phone_number", "email", "fcm_token"}
        data = {k: v for k, v in request.data.items() if k in allowed_fields}
        serializer = UserSerializer(request.user, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    """
    POST /api/v1/auth/change-password/
    P22: Allow user to change their own password.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        old_password = request.data.get("old_password", "")
        new_password = request.data.get("new_password", "")
        if not old_password or not new_password:
            return Response({"detail": "Both old_password and new_password are required."}, status=400)
        if not request.user.check_password(old_password):
            return Response({"detail": "Current password is incorrect."}, status=400)
        if len(new_password) < 8:
            return Response({"detail": "New password must be at least 8 characters."}, status=400)
        request.user.set_password(new_password)
        request.user.save()
        _log(request.user, "auth.change_password", request=request)
        return Response({"detail": "Password changed successfully."})


class AdminResetPasswordView(APIView):
    """
    POST /api/v1/users/{id}/reset-password/
    P22: SysAdmin can reset any user's password.
    """
    permission_classes = [IsAuthenticated, IsSysAdmin]

    def post(self, request, pk):
        target = IreroUser.objects.filter(pk=pk).first()
        if not target:
            return Response({"detail": "User not found."}, status=404)
        new_password = request.data.get("new_password", "")
        if not new_password or len(new_password) < 8:
            return Response({"detail": "new_password must be at least 8 characters."}, status=400)
        target.set_password(new_password)
        target.failed_login_count = 0
        target.locked_until = None
        target.save()
        _log(request.user, "user.reset_password", record_id=pk, request=request)
        return Response({"detail": f"Password for {target.username} has been reset."})


class UserListCreateView(APIView):
    """
    GET  /api/v1/users/         — list all users (SysAdmin only)
    POST /api/v1/users/         — create new user (SysAdmin only)
    FR-007
    """
    permission_classes = [IsAuthenticated, IsSysAdmin]

    def get(self, request):
        users = IreroUser.objects.all().order_by("full_name")
        return Response(UserSerializer(users, many=True).data)

    def post(self, request):
        serializer = CreateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        _log(request.user, "user.create", record_id=user.id, request=request)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class UserDetailView(APIView):
    """
    PATCH  /api/v1/users/{id}/     — edit user or assign role
    DELETE /api/v1/users/{id}/     — deactivate user
    POST   /api/v1/users/{id}/wipe/ — remote data wipe (SRS §9.4)
    FR-007, SRS §9.4
    """
    permission_classes = [IsAuthenticated, IsSysAdmin]

    def _get_user(self, pk):
        try:
            return IreroUser.objects.get(pk=pk)
        except IreroUser.DoesNotExist:
            return None

    def patch(self, request, pk):
        target = self._get_user(pk)
        if not target:
            return Response({"detail": "User not found."}, status=404)
        serializer = CreateUserSerializer(target, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _log(request.user, "user.update", record_id=pk, request=request)
        return Response(UserSerializer(target).data)

    def delete(self, request, pk):
        target = self._get_user(pk)
        if not target:
            return Response({"detail": "User not found."}, status=404)
        target.is_active = False
        target.save(update_fields=["is_active"])
        _log(request.user, "user.deactivate", record_id=pk, request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsSysAdmin])
def remote_wipe_view(request, pk):
    """
    POST /api/v1/users/{id}/wipe/
    Flags the user account for remote data wipe.
    The mobile app checks this flag on next sync and erases local SQLite data.
    SRS §9.4
    """
    target = IreroUser.objects.filter(pk=pk).first()
    if not target:
        return Response({"detail": "User not found."}, status=404)
    # Set a flag the mobile app polls — actual wipe happens on device
    target.fcm_token = ""   # Also clear FCM so no more push notifications
    target.is_active = False
    target.save(update_fields=["fcm_token", "is_active"])
    _log(request.user, "user.remote_wipe", record_id=pk, request=request)
    return Response({"detail": "Remote wipe scheduled. Device will erase data on next connectivity."})


class AuditLogListView(APIView):
    """
    GET /api/v1/audit-logs/
    Returns audit logs for the SysAdmin. GAP-005.
    """
    permission_classes = [IsAuthenticated, IsSysAdmin]

    def get(self, request):
        from .serializers import AuditLogSerializer
        # limit to 100 for simplicity or use pagination
        logs = AuditLog.objects.all().order_by("-changed_at")[:100]
        return Response(AuditLogSerializer(logs, many=True).data)
class CentreStaffView(APIView):
    """
    GET /api/v1/users/centre-staff/
    POST /api/v1/users/centre-staff/
    Allows Centre Manager to view and add staff to their centre. GAP-007.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in [Role.CENTRE_MGR, Role.SYS_ADMIN]:
            return Response({"detail": "Not authorized."}, status=403)
        users = IreroUser.objects.filter(centre_id=request.user.centre_id, is_active=True)
        return Response(UserSerializer(users, many=True).data)

    def post(self, request):
        if request.user.role not in [Role.CENTRE_MGR, Role.SYS_ADMIN]:
            return Response({"detail": "Not authorized."}, status=403)
        data = request.data.copy()
        data["centre_id"] = request.user.centre_id
        # Force role to caregiver or chw if Centre Manager is creating
        if data.get("role") not in [Role.CAREGIVER, Role.CHW]:
            data["role"] = Role.CAREGIVER
        
        serializer = CreateUserSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        _log(request.user, "user.create_staff", record_id=user.id, request=request)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

class CentreStaffDetailView(APIView):
    """
    DELETE /api/v1/users/centre-staff/{id}/
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        if request.user.role not in [Role.CENTRE_MGR, Role.SYS_ADMIN]:
            return Response({"detail": "Not authorized."}, status=403)
        target = IreroUser.objects.filter(pk=pk, centre_id=request.user.centre_id).first()
        if not target:
            return Response({"detail": "Not found."}, status=404)
        target.is_active = False
        target.save(update_fields=["is_active"])
        _log(request.user, "user.remove_staff", record_id=pk, request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)
