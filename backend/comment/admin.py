from django.contrib import admin
from shuwei.admin_base import LibraryModelAdmin
from shuwei.admin_formatting import admin_text_preview
from notifications.admin_cascade import ReviewCascadeDeleteMixin
from .models import Comment


@admin.register(Comment)
class CommentAdmin(ReviewCascadeDeleteMixin, LibraryModelAdmin):
    list_display = ('user_name', 'author_type', 'user_email', 'comment_preview', 'content_object', 'is_public', 'is_removed', 'submit_date')
    list_filter = ('is_guest', 'is_public', 'is_removed', 'submit_date')
    search_fields = ('user_name', 'user_email', 'comment')
    readonly_fields = ('user', 'user_name', 'author_type', 'user_email', 'comment', 'submit_date', 'updated_at', 'content_type', 'object_id', 'content_object', 'parent', 'level', 'thread_id', 'order')
    list_editable = ('is_public', 'is_removed')
    ordering = ('-submit_date', '-pk')
    list_select_related = ('content_type', 'user')

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('content_object')
    
    def has_add_permission(self, request):
        """禁止在admin中添加新的评论"""
        return False
    
    fieldsets = (
        ('评论信息', {
            'fields': ('user', 'user_name', 'author_type', 'user_email', 'comment')
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
        return admin_text_preview(obj.comment)
    comment_preview.short_description = '评论预览'

    @admin.display(description='评论身份')
    def author_type(self, obj):
        if obj.is_guest is None:
            return '历史评论（身份未记录）'
        return '访客' if obj.is_guest else '登录用户'
    
    actions = ['approve_comments', 'reject_comments', 'remove_comments']

    def _update_status(self, request, queryset, message, **changes):
        # A filtered queryset may become empty after changing its status. Use
        # the update result rather than counting the now-different queryset.
        from .moderation import moderate_queryset
        count = moderate_queryset(queryset, **changes)
        self.message_user(request, f'{message} {count} 条评论')

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if change:
            from .moderation import invalidate_telegram
            invalidate_telegram(Comment.objects.filter(pk=obj.pk))
    
    def approve_comments(self, request, queryset):
        """批准评论"""
        self._update_status(request, queryset, '已批准', is_public=True, is_removed=False)
    approve_comments.short_description = "批准选中的评论"
    
    def reject_comments(self, request, queryset):
        """拒绝评论"""
        self._update_status(request, queryset, '已拒绝', is_public=False)
    reject_comments.short_description = "拒绝选中的评论"
    
    def remove_comments(self, request, queryset):
        """删除评论"""
        self._update_status(request, queryset, '已删除', is_removed=True)
    remove_comments.short_description = "删除选中的评论"

