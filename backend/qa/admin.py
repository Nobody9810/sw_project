from django.contrib import admin
from unfold.admin import TabularInline
from shuwei.admin_base import LibraryModelAdmin
from shuwei.admin_formatting import admin_text_preview
from .models import Question, Answer
from django.forms.models import BaseInlineFormSet
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone


class ApprovedQuestionAnswers(BaseInlineFormSet):
    def clean(self):
        super().clean()
        if self.instance.status != 'published' and any(
                form.cleaned_data and not form.cleaned_data.get('DELETE') and form.has_changed()
                for form in self.forms):
            raise ValidationError('请先通过问题审核，再添加或修改回答。')

class AnswerInline(TabularInline):
    model = Answer
    extra = 1
    formset = ApprovedQuestionAnswers
    readonly_fields = ('author',)

@admin.register(Question)
class QuestionAdmin(LibraryModelAdmin):
    list_display = ('question_preview', 'author', 'guest_name', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('content',)
    list_select_related = ('author',)
    ordering = ('-created_at', '-pk')
    inlines = [AnswerInline]
    actions = ['make_published']
    readonly_fields = ('content', 'author', 'guest_name', 'created_at', 'updated_at')
    fieldsets = (
        ('问题信息', {
            'fields': ('content', 'author', 'guest_name', 'status', 'created_at', 'updated_at')
        }),
    )
    
    def has_add_permission(self, request):
        """禁止在admin中添加新的问题"""
        return False

    @admin.display(description='问题', ordering='content')
    def question_preview(self, obj):
        return admin_text_preview(obj.content)

    @admin.action(description='发布选中的问题')
    def make_published(self, request, queryset):
        from notifications.models import TelegramReview
        with transaction.atomic():
            ids = list(queryset.select_for_update().order_by('pk').values_list('pk', flat=True))
            queryset.model.objects.filter(pk__in=ids).update(status='published', updated_at=timezone.now())
            TelegramReview.objects.filter(question_id__in=ids, status='pending').update(
                status='superseded', processed_at=timezone.now())

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        # changeform_view provides the transaction; changelist POSTs do not.
        changing = request.resolver_match and request.resolver_match.url_name == 'qa_question_change'
        return queryset.select_for_update() if request.method == 'POST' and changing else queryset

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        from notifications.models import TelegramReview
        TelegramReview.objects.filter(question=obj, status='pending').update(
            status='superseded', processed_at=timezone.now())

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)
        for instance in formset.deleted_objects:
            instance.delete()
        for instance in instances:
            if instance.pk is None:
                instance.author = request.user
            instance.save()
        formset.save_m2m()

# 回答通过问题内联管理，不重复注册独立入口。
