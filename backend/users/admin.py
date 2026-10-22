from django.contrib import admin, messages
from django.utils.html import format_html
from shuwei.admin_base import LibraryModelAdmin
from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(LibraryModelAdmin):
    # Uploaded avatars are public next to comments; this view exists to remove unsuitable ones.
    list_display = ('preview', 'reader', 'avatar_preset', 'updated_at')
    fields = ('preview', 'reader', 'avatar_preset', 'updated_at')
    readonly_fields = fields
    ordering = ('-updated_at',)
    actions = ['remove_uploaded']

    @admin.display(description='头像')
    def preview(self, obj):
        if not obj.avatar:
            return '—'
        return format_html('<img src="{}" alt="" width="48" height="48" style="border-radius:9999px">', obj.avatar.url)

    @admin.display(description='读者')
    def reader(self, obj):
        return obj.user.first_name or f'读者 #{obj.user_id}'

    @admin.action(description='移除上传的头像（恢复为昵称首字）')
    def remove_uploaded(self, request, queryset):
        count = 0
        for profile in queryset.exclude(avatar=''):
            profile.avatar.delete(save=False)
            profile.save(update_fields=['avatar', 'updated_at'])
            count += 1
        self.message_user(request, f'已移除 {count} 个上传的头像', messages.SUCCESS)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
