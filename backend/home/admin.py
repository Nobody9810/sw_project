from unfold.admin import ModelAdmin
from django.contrib import admin

from .models import 通讯, 书讯, 书评, 观点, 文艺, 译林, 文史, 论文, 古籍, 书库, Feedback, 书评_分类

# 通用批量操作函数
def reset_likes_dislikes_and_views(modeladmin, request, queryset):
    queryset.update(likes=0, dislikes=0, 总浏览量=0, 今日浏览量=0)
    modeladmin.message_user(request, "选定的记录的点赞数、点踩数和浏览量已清零。")
reset_likes_dislikes_and_views.short_description = "清空点赞数、点踩数和浏览量"

# 为每个模型单独注册 admin，使用 unfold 的 ModelAdmin
@admin.register(通讯)
class 通讯Admin(ModelAdmin):
    list_display = ('标题', 'likes', '总浏览量', '更新时间', '发布状态')
    exclude = ('likes', 'dislikes', '总浏览量', '今日浏览量', '最后统计日期')
    actions = [reset_likes_dislikes_and_views]

@admin.register(书讯)
class 书讯Admin(ModelAdmin):
    list_display = ('标题', 'likes', '总浏览量', '更新时间', '发布状态')
    exclude = ('likes', 'dislikes', '总浏览量', '今日浏览量', '最后统计日期')
    actions = [reset_likes_dislikes_and_views]

@admin.register(书评_分类)
class 书评_分类Admin(ModelAdmin):
    list_display = ('名称',)
    search_fields = ('名称',)

@admin.register(书评)
class 书评Admin(ModelAdmin):
    list_display = ('标题', '分类', 'likes', '总浏览量', '更新时间', '发布状态')
    list_filter = ('分类', '发布状态', '更新时间')
    search_fields = ('标题', '作者')
    exclude = ('likes', 'dislikes', '总浏览量', '今日浏览量', '最后统计日期')
    actions = [reset_likes_dislikes_and_views]

@admin.register(观点)
class 观点Admin(ModelAdmin):
    list_display = ('标题', 'likes', '总浏览量', '更新时间', '发布状态')
    exclude = ('likes', 'dislikes', '总浏览量', '今日浏览量', '最后统计日期')
    actions = [reset_likes_dislikes_and_views]

@admin.register(文艺)
class 文艺Admin(ModelAdmin):
    list_display = ('标题', 'likes', '总浏览量', '更新时间', '发布状态')
    exclude = ('likes', 'dislikes', '总浏览量', '今日浏览量', '最后统计日期')
    actions = [reset_likes_dislikes_and_views]

@admin.register(译林)
class 译林Admin(ModelAdmin):
    list_display = ('标题', 'likes', '总浏览量', '更新时间', '发布状态')
    exclude = ('likes', 'dislikes', '总浏览量', '今日浏览量', '最后统计日期')
    actions = [reset_likes_dislikes_and_views]

@admin.register(文史)
class 文史Admin(ModelAdmin):
    list_display = ('标题', 'likes', '总浏览量', '更新时间', '发布状态')
    exclude = ('likes', 'dislikes', '总浏览量', '今日浏览量', '最后统计日期')
    actions = [reset_likes_dislikes_and_views]

@admin.register(论文)
class 论文Admin(ModelAdmin):
    list_display = ('标题', 'likes', '总浏览量', '更新时间', '发布状态')
    exclude = ('likes', 'dislikes', '总浏览量', '今日浏览量', '最后统计日期')
    actions = [reset_likes_dislikes_and_views]

@admin.register(古籍)
class 古籍Admin(ModelAdmin):
    list_display = ('标题', 'likes', '总浏览量', '更新时间', '发布状态')
    exclude = ('likes', 'dislikes', '总浏览量', '今日浏览量', '最后统计日期')
    actions = [reset_likes_dislikes_and_views]

@admin.register(书库)
class 书库Admin(ModelAdmin):
    list_display = ('标题', 'likes', '总浏览量', '更新时间', '发布状态')
    exclude = ('图片', 'likes', 'dislikes', '总浏览量', '今日浏览量', '最后统计日期')  # 排除封面图片字段和统计数据字段
    actions = [reset_likes_dislikes_and_views]

# 批量标记为已处理
def mark_as_processed(modeladmin, request, queryset):
    count = queryset.update(已处理=True)
    modeladmin.message_user(request, f"已将 {count} 条建议标记为已处理。")
mark_as_processed.short_description = "标记为已处理"

# 批量标记为未处理
def mark_as_unprocessed(modeladmin, request, queryset):
    count = queryset.update(已处理=False)
    modeladmin.message_user(request, f"已将 {count} 条建议标记为未处理。")
mark_as_unprocessed.short_description = "标记为未处理"

@admin.register(Feedback)
class FeedbackAdmin(ModelAdmin):
    list_display = ('姓名', '邮箱', '提交时间', '已处理', '处理状态')
    list_filter = ('已处理', '提交时间')
    search_fields = ('姓名', '邮箱', '建议内容')
    readonly_fields = ('姓名', '邮箱', '建议内容', '提交时间')
    actions = [mark_as_processed, mark_as_unprocessed]
    list_per_page = 20
    date_hierarchy = '提交时间'
    fieldsets = (
        ('反馈信息', {
            'fields': ('姓名', '邮箱', '建议内容', '提交时间')
        }),
        ('处理状态', {
            'fields': ('已处理', '处理备注')
        }),
    )
    
    def has_add_permission(self, request):
        """禁止在admin中添加新的反馈"""
        return False
    
    def 处理状态(self, obj):
        if obj.已处理:
            return '✓ 已处理'
        return '○ 待处理'
    处理状态.short_description = '状态'
