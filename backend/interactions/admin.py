from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import UserReaction, ViewCount, ViewRecord


@admin.register(UserReaction)
class UserReactionAdmin(ModelAdmin):
    list_display = ('user_session', 'reaction_type', 'content_type', 'object_id', 'created_at')
    list_filter = ('reaction_type', 'content_type', 'created_at')
    search_fields = ('user_session',)
    readonly_fields = ('created_at',)


@admin.register(ViewCount)
class ViewCountAdmin(ModelAdmin):
    list_display = ('content_type', 'object_id', '总浏览量', '今日浏览量', '最后统计日期')
    list_filter = ('最后统计日期', 'content_type')
    search_fields = ('object_id',)
    readonly_fields = ('最后统计日期',)


@admin.register(ViewRecord)
class ViewRecordAdmin(ModelAdmin):
    list_display = ('user_session', 'content_type', 'object_id', 'viewed_at', 'ip_address')
    list_filter = ('viewed_at', 'content_type')
    search_fields = ('user_session', 'ip_address')
    readonly_fields = ('viewed_at',)
    date_hierarchy = 'viewed_at'
