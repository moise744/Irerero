# nutrition/admin.py
from django.contrib import admin
from .models import NutritionProgramme, Meal, FoodIntakeFlag

@admin.register(NutritionProgramme)
class NutritionProgrammeAdmin(admin.ModelAdmin):
    list_display = ["child", "programme_type", "enrolment_date", "outcome"]
    list_filter = ["programme_type", "outcome"]

@admin.register(Meal)
class MealAdmin(admin.ModelAdmin):
    list_display = ["centre", "date", "menu_description", "children_fed_count"]
    list_filter = ["date"]

@admin.register(FoodIntakeFlag)
class FoodIntakeFlagAdmin(admin.ModelAdmin):
    list_display = ["child", "meal", "poor_intake"]
