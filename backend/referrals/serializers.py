# referrals/serializers.py
from rest_framework import serializers
from .models import Referral, ReferralStatus


class ReferralSerializer(serializers.ModelSerializer):
    child_name = serializers.CharField(source="child.full_name", read_only=True)

    class Meta:
        model  = Referral
        fields = [
            "id", "child", "child_name", "referral_date", "reason",
            "referral_slip_url", "status", "health_centre_name",
            "outcome_date", "diagnosis", "treatment", "hospitalised",
            "follow_up_instructions", "referred_by", "followed_up_by",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "referral_slip_url", "referred_by",
                             "created_at", "updated_at"]

    def create(self, validated_data):
        user = self.context["request"].user
        referral = Referral.objects.create(**validated_data, referred_by=user.id)
        # Trigger SMS to parent — FR-077
        self._send_referral_sms(referral)
        return referral

    def _send_referral_sms(self, referral):
        from notifications.providers import get_sms_provider
        child = referral.child
        if not child.guardian_phone:
            return
        message = (
            f"Ubutumwa bw'inshuti ya Irerero: Umwana wawe {child.full_name} "
            f"yoherejwe ku kigo cy'ubuzima: {referral.health_centre_name}. "
            f"Impamvu: {referral.reason[:80]}. "
            f"Mwimukire kugirango musuzumwe."
        )
        provider = get_sms_provider()
        provider.send(
            to=child.guardian_phone,
            message=message,
            msg_type="referral_created",
            child_id=child.id,
        )
