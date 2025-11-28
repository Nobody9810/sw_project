from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import HadithCollection, Hadith


@admin.register(HadithCollection)
class HadithCollectionAdmin(ModelAdmin):
    list_display = ('name', 'short_name', 'arabic_name', 'total_hadiths', 'is_sahih')
    list_filter = ('is_sahih',)
    search_fields = ('name', 'short_name', 'arabic_name')
    list_editable = ('is_sahih',)


@admin.register(Hadith)
class HadithAdmin(ModelAdmin):
    list_display = ('collection', 'collection_number', 'chapter', 'text_preview')
    list_filter = ('collection',)
    search_fields = ('collection_number', 'chapter', 'text')
    readonly_fields = ('collection',)
    
    def text_preview(self, obj):
        """正文预览"""
        return obj.text[:100] + '...' if len(obj.text) > 100 else obj.text
    text_preview.short_description = '正文预览'
