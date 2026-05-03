from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("enrolments", views.NutritionProgrammeViewSet, basename="nutrition-enrolments")
router.register("meals",      views.MealViewSet,               basename="meals")
router.register("intake",     views.FoodIntakeFlagViewSet,     basename="food-intake")

urlpatterns = [path("", include(router.urls))]
