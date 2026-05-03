# attendance/serializers.py
from rest_framework import serializers
from .models import Attendance, AttendanceStatus


class AttendanceSerializer(serializers.ModelSerializer):
    child_name = serializers.CharField(source="child.full_name", read_only=True)

    class Meta:
        model  = Attendance
        fields = ["id", "child", "child_name", "date", "status",
                  "absence_reason", "recorded_by", "recorded_at"]
        read_only_fields = ["id", "recorded_by", "recorded_at"]


class BulkAttendanceSerializer(serializers.Serializer):
    """
    Accepts a list of attendance records in a single POST — efficient for daily
    30-child attendance recording (NFR-017: max 35 taps for 30 children).
    """
    records = serializers.ListField(
        child=serializers.DictField(),
        min_length=1,
    )

    def validate_records(self, records):
        for rec in records:
            if "child_id" not in rec or "status" not in rec or "date" not in rec:
                raise serializers.ValidationError(
                    "Each record must include child_id, status, and date."
                )
            if rec["status"] not in [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT]:
                raise serializers.ValidationError(
                    f"Invalid status '{rec['status']}'. Use 'present' or 'absent'."
                )
        return records
