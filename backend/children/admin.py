# children/admin.py — Register all children module models with Django admin
from django.contrib import admin
from .models import Centre, Child


@admin.register(Centre)
class CentreAdmin(admin.ModelAdmin):
    list_display = ["code", "centre_name", "province", "is_active"]
    search_fields = ["centre_name", "code"]
    list_filter = ["province", "is_active"]


@admin.register(Child)
class ChildAdmin(admin.ModelAdmin):
    list_display = ["irerero_id", "full_name", "sex", "date_of_birth", "centre", "status"]
    search_fields = ["full_name", "irerero_id", "guardian_name"]
    list_filter = ["status", "sex", "centre"]
    readonly_fields = ["irerero_id", "created_at", "updated_at"]
