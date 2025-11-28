from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import Comment


@admin.register(Comment)
class CommentAdmin(ModelAdmin):
    list_display = ('user_name', 'user_email', 'comment_preview', 'content_object', 'is_public', 'is_removed', 'submit_date')
    list_filter = ('is_public', 'is_removed', 'submit_date')
    search_fields = ('user_name', 'user_email', 'comment')
    readonly_fields = ('user_name', 'user_email', 'comment', 'submit_date', 'updated_at', 'content_type', 'object_id', 'content_object', 'parent', 'level', 'thread_id', 'order')
    list_editable = ('is_public', 'is_removed')
    ordering = ['-submit_date']  # 按提交时间从最新到最旧排序
    
    def has_add_permission(self, request):
        """禁止在admin中添加新的评论"""
        return False
    
    fieldsets = (
        ('评论信息', {
            'fields': ('user_name', 'user_email', 'comment')
        }),
        ('关联内容', {
            'fields': ('content_type', 'object_id', 'content_object')
        }),
        ('回复信息', {
            'fields': ('parent', 'level', 'thread_id', 'order')
        }),
        ('状态', {
            'fields': ('is_public', 'is_removed', 'site_id')
        }),
        ('时间', {
            'fields': ('submit_date', 'updated_at')
        }),
    )
    
    def comment_preview(self, obj):
        """评论预览"""
        return obj.comment[:50] + '...' if len(obj.comment) > 50 else obj.comment
    comment_preview.short_description = '评论预览'
    
    actions = ['approve_comments', 'reject_comments', 'remove_comments']
    
    def approve_comments(self, request, queryset):
        """批准评论"""
        queryset.update(is_public=True, is_removed=False)
        self.message_user(request, f'已批准 {queryset.count()} 条评论')
    approve_comments.short_description = "批准选中的评论"
    
    def reject_comments(self, request, queryset):
        """拒绝评论"""
        queryset.update(is_public=False)
        self.message_user(request, f'已拒绝 {queryset.count()} 条评论')
    reject_comments.short_description = "拒绝选中的评论"
    
    def remove_comments(self, request, queryset):
        """删除评论"""
        queryset.update(is_removed=True)
        self.message_user(request, f'已删除 {queryset.count()} 条评论')
    remove_comments.short_description = "删除选中的评论"

