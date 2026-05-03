# nutrition/serializers.py
from rest_framework import serializers
from .models import NutritionProgramme, Meal, FoodIntakeFlag


class NutritionProgrammeSerializer(serializers.ModelSerializer):
    child_name = serializers.CharField(source="child.full_name", read_only=True)

    class Meta:
        model  = NutritionProgramme
        fields = ["id", "child", "child_name", "programme_type",
                  "enrolment_date", "expected_end_date", "actual_end_date", "outcome"]
        read_only_fields = ["id"]


class MealSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Meal
        fields = ["id", "centre", "date", "menu_description",
                  "children_fed_count", "recorded_by", "created_at"]
        read_only_fields = ["id", "recorded_by", "created_at"]


class FoodIntakeFlagSerializer(serializers.ModelSerializer):
    child_name = serializers.CharField(source="child.full_name", read_only=True)

    class Meta:
        model  = FoodIntakeFlag
        fields = ["id", "child", "child_name", "meal", "poor_intake",
                  "notes", "recorded_by", "recorded_at"]
        read_only_fields = ["id", "recorded_by", "recorded_at"]
