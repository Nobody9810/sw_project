from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from .models import Question, Answer

class AnswerInline(TabularInline):
    model = Answer
    extra = 1

@admin.register(Question)
class QuestionAdmin(ModelAdmin):
    list_display = ('content', 'author', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('content',)
    inlines = [AnswerInline]
    actions = ['make_published']
    readonly_fields = ('content', 'author', 'created_at', 'updated_at')
    fieldsets = (
        ('问题信息', {
            'fields': ('content', 'author', 'status', 'created_at', 'updated_at')
        }),
    )
    
    def has_add_permission(self, request):
        """禁止在admin中添加新的问题"""
        return False

    @admin.action(description='Mark selected questions as published')
    def make_published(self, request, queryset):
        queryset.update(status='published')

# 不注册AnswerAdmin，回答只能通过问题的内联方式管理
# @admin.register(Answer)
# class AnswerAdmin(ModelAdmin):
#     list_display = ('question', 'author', 'created_at', 'is_accepted')
#     list_filter = ('created_at', 'is_accepted')
