# nutrition/views.py
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet
from auth_module.permissions import ScopedQuerysetMixin
from .models import NutritionProgramme, Meal, FoodIntakeFlag
from .serializers import NutritionProgrammeSerializer, MealSerializer, FoodIntakeFlagSerializer


class NutritionProgrammeViewSet(ScopedQuerysetMixin, ModelViewSet):
    """POST /api/v1/nutrition/enrolments/ — enrol child. FR-050."""
    queryset = NutritionProgramme.objects.all()
    scope_field      = "child__centre"
    serializer_class = NutritionProgrammeSerializer

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user.id)


class MealViewSet(ModelViewSet):
    """POST /api/v1/nutrition/meals/ — record daily meal. FR-048."""
    serializer_class   = MealSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Meal.objects.all()
        centre = self.request.query_params.get("centre")
        if centre:
            qs = qs.filter(centre=centre)
        return qs.order_by("-date")

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user.id)


class FoodIntakeFlagViewSet(ScopedQuerysetMixin, ModelViewSet):
    """POST /api/v1/nutrition/meals/{id}/intake/ — flag poor intake. FR-049."""
    queryset = FoodIntakeFlag.objects.all()
    scope_field      = "child__centre"
    serializer_class = FoodIntakeFlagSerializer

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user.id)
