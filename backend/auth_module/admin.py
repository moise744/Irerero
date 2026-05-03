from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import IreroUser, AuditLog

@admin.register(IreroUser)
class IreroUserAdmin(UserAdmin):
    list_display   = ["username", "full_name", "role", "is_active"]
    list_filter    = ["role", "is_active"]
    fieldsets      = ((None, {"fields": ("username", "password")}),
                      ("Personal info", {"fields": ("full_name", "role", "phone_number", "email")}),
                      ("Scope", {"fields": ("centre_id", "sector_id", "district_id")}),
                      ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser")}))
    add_fieldsets  = ((None, {"fields": ("username", "password1", "password2", "full_name", "role")}),)
    search_fields  = ["username", "full_name"]
    ordering       = ["username"]

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["action", "user", "table_name", "changed_at"]
    list_filter  = ["action", "table_name"]
    readonly_fields = ["id", "changed_at"]
