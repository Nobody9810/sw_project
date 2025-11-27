from unfold.admin import ModelAdmin
from django.contrib import admin

from .models import 通讯, 书讯, 书评, 观点, 文艺, 译林, 文史, 论文, 古籍, 书库

# 通用批量操作函数
def reset_likes_dislikes_and_views(modeladmin, request, queryset):
    queryset.update(likes=0, dislikes=0, 总浏览量=0, 今日浏览量=0)
    modeladmin.message_user(request, "选定的记录的点赞数、点踩数和浏览量已清零。")
reset_likes_dislikes_and_views.short_description = "清空点赞数、点踩数和浏览量"

# 为每个模型单独注册 admin，使用 unfold 的 ModelAdmin
@admin.register(通讯)
class 通讯Admin(ModelAdmin):
    list_display = ('标题', 'likes', 'dislikes', '总浏览量', '今日浏览量', '更新时间')
    actions = [reset_likes_dislikes_and_views]

@admin.register(书讯)
class 书讯Admin(ModelAdmin):
    list_display = ('标题', 'likes', 'dislikes', '总浏览量', '今日浏览量', '更新时间')
    actions = [reset_likes_dislikes_and_views]

@admin.register(书评)
class 书评Admin(ModelAdmin):
    list_display = ('标题', 'likes', 'dislikes', '总浏览量', '今日浏览量', '更新时间')
    actions = [reset_likes_dislikes_and_views]

@admin.register(观点)
class 观点Admin(ModelAdmin):
    list_display = ('标题', 'likes', 'dislikes', '总浏览量', '今日浏览量', '更新时间')
    actions = [reset_likes_dislikes_and_views]

@admin.register(文艺)
class 文艺Admin(ModelAdmin):
    list_display = ('标题', 'likes', 'dislikes', '总浏览量', '今日浏览量', '更新时间')
    actions = [reset_likes_dislikes_and_views]

@admin.register(译林)
class 译林Admin(ModelAdmin):
    list_display = ('标题', 'likes', 'dislikes', '总浏览量', '今日浏览量', '更新时间')
    actions = [reset_likes_dislikes_and_views]

@admin.register(文史)
class 文史Admin(ModelAdmin):
    list_display = ('标题', 'likes', 'dislikes', '总浏览量', '今日浏览量', '更新时间')
    actions = [reset_likes_dislikes_and_views]

@admin.register(论文)
class 论文Admin(ModelAdmin):
    list_display = ('标题', 'likes', 'dislikes', '总浏览量', '今日浏览量', '更新时间')
    actions = [reset_likes_dislikes_and_views]

@admin.register(古籍)
class 古籍Admin(ModelAdmin):
    list_display = ('标题', 'likes', 'dislikes', '总浏览量', '今日浏览量', '更新时间')
    actions = [reset_likes_dislikes_and_views]

@admin.register(书库)
class 书库Admin(ModelAdmin):
    list_display = ('标题', 'likes', 'dislikes', '总浏览量', '今日浏览量', '更新时间')
    actions = [reset_likes_dislikes_and_views]
