from django.contrib import admin
from django.contrib.auth.models import User, Group
from unfold.admin import ModelAdmin

# 取消默认注册
admin.site.unregister(User)
admin.site.unregister(Group)


# 使用 unfold 的 ModelAdmin 重新注册
@admin.register(User)
class UserAdmin(ModelAdmin):
    list_display = ("username", "email", "first_name", "last_name", "is_staff", "is_active")
    list_filter = ("is_staff", "is_superuser", "is_active", "groups")
    search_fields = ("username", "first_name", "last_name", "email")
    ordering = ("username",)
    filter_horizontal = ("groups", "user_permissions")
    
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("个人信息", {"fields": ("first_name", "last_name", "email")}),
        (
            "权限",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        ("重要日期", {"fields": ("last_login", "date_joined")}),
    )


@admin.register(Group)
class GroupAdmin(ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)
    filter_horizontal = ("permissions",)

