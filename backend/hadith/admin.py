from django.contrib import admin
from shuwei.admin_base import LibraryModelAdmin
from shuwei.admin_formatting import admin_text_preview
from django.db.models import Count
from .models import HadithCollection, Hadith


@admin.register(HadithCollection)
class HadithCollectionAdmin(LibraryModelAdmin):
    list_display = ('name', 'author', 'translator', 'publisher', 'publication_date', 'record_count')
    search_fields = ('name', 'author', 'translator', 'publisher', 'isbn')
    ordering = ('pk',)
    readonly_fields = ('record_count',)
    exclude = ('short_name', 'total_hadiths', 'data_quality')
    fieldsets = (
        ('基本信息', {'fields': ('name', 'record_count')}),
        ('介绍与历史', {'fields': ('introduction', 'history', 'history_source')}),
        ('本站采用版本', {'fields': ('source_version', 'author', 'translator',
                                  'publisher', 'publication_date', 'isbn')}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_record_count=Count('hadiths'))

    @admin.display(description='实际正文条数', ordering='_record_count')
    def record_count(self, obj):
        if obj is None or not obj.pk:
            return 0
        if hasattr(obj, '_record_count'):
            return obj._record_count
        return obj.hadiths.count()


@admin.register(Hadith)
class HadithAdmin(LibraryModelAdmin):
    list_display = ('collection', 'collection_number', 'chapter', 'text_preview')
    list_filter = ('collection',)
    search_fields = ('collection_number', 'chapter', 'text', 'reading_search')
    readonly_fields = ('collection',)
    list_select_related = ('collection',)
    
    def text_preview(self, obj):
        """正文预览"""
        return admin_text_preview(obj.text)
    text_preview.short_description = '正文预览'
