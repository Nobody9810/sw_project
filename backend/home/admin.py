from unfold.admin import StackedInline
from shuwei.admin_base import LibraryModelAdmin
from shuwei.admin_formatting import admin_badge
from django.contrib import admin
from django.utils.html import format_html
from .forms import ArticleAdminForm
from .models import 通讯, 书讯, 书评, 观点, 文艺, 译林, 文史, 论文, 古籍, 书库, Feedback, 书评_分类, 书讯Sale
from .models import ReleaseNote


@admin.register(ReleaseNote)
class ReleaseNoteAdmin(LibraryModelAdmin):
    list_display = ('version', 'title', 'published_at', 'is_published', 'notify')
    list_filter = ('is_published', 'notify')
    search_fields = ('version', 'title', 'summary')
    fields = ('version', 'title', 'summary', 'content', 'published_at', 'is_published', 'notify')


@admin.action(description="清空点赞数、点踩数和浏览量")
def reset_likes_dislikes_and_views(modeladmin, request, queryset):
    from interactions.services import reset_statistics
    reset_statistics(queryset)
    modeladmin.message_user(request, "选定的记录的点赞数、点踩数和浏览量已清零。")


class ArticleModelAdmin(LibraryModelAdmin):
    form = ArticleAdminForm
    list_display = ('标题', '作者', 'likes', '总浏览量', '更新时间', '发布状态')
    search_fields = ('标题', '作者')
    list_filter = ('发布状态', '更新时间')
    ordering = ('-更新时间', '-pk')
    readonly_fields = ('更新时间', 'x_share', 'telegram_status')
    exclude = ('likes', 'dislikes', '总浏览量', '今日浏览量', '最后统计日期')
    actions = [reset_likes_dislikes_and_views]

    def get_fieldsets(self, request, obj=None):
        # Derive from real editable fields; future model fields remain accessible.
        excluded = set(self.get_exclude(request, obj) or ())
        readonly = self.get_readonly_fields(request, obj)
        available = [field.name for field in (*self.model._meta.fields, *self.model._meta.many_to_many)
                     if not field.primary_key and field.name not in excluded
                     and (field.editable or field.name in readonly)]
        available.extend(name for name in readonly if name not in available and name not in excluded)
        available.extend(name for name in ('telegram_publish', 'telegram_retry') if name not in excluded)
        groups = (
            ('基本信息', ('标题', '作者', '分类', '原文标题', '原文作者', '出处', '资源'), False),
            ('图书与出版信息', ('ISBN', '出版社', '出版年', '出版日期', '书籍出版日期', '原文出版日期', '定价', '页数', '装帧'), False),
            ('正文', ('内容',), False),
            ('补充内容', ('作者简介', '目录', '前言'), False),
            ('图片与PDF', ('图片', '文档'), False),
            ('发布设置', ('发布状态', '更新时间'), False),
            ('社交媒体分发', ('x_share', 'telegram_publish', 'telegram_status', 'telegram_retry'), False),
        )
        fieldsets = []
        for label, names, collapse in groups:
            fields = [name for name in names if name in available]
            if fields:
                options = {'fields': tuple(fields)}
                if collapse:
                    options['classes'] = ('collapse',)
                fieldsets.append((label, options))
                available = [name for name in available if name not in fields]
        if available:
            fieldsets.append(('其他信息', {'fields': tuple(available)}))
        return fieldsets

    @admin.display(description='免费分享到 X')
    def x_share(self, obj):
        if not obj or not obj.pk or not obj.发布状态:
            return '保存并发布文章后可用。'
        from notifications.publishing import x_share_url, local_test_mode
        url = x_share_url(obj)
        if not url:
            return '请将 PUBLIC_SITE_URL 设置为公开的 HTTPS 网站来源地址。'
        if local_test_mode():
            return format_html('<a href="{}" target="_blank" rel="noopener noreferrer">测试分享到 X ↗</a> · {}',
                               url, '文案标有“本地测试”，不附 localhost 链接；在 X 确认后才会发布。')
        return format_html('<a href="{}" target="_blank" rel="noopener noreferrer">分享到 X ↗</a> · {}',
                           url, '自动填写标题、作者、摘要和链接；在 X 确认后发布，不使用付费 API。')

    @admin.display(description='频道发送状态')
    def telegram_status(self, obj):
        from notifications.publishing import distribution_for, configuration_error, local_test_mode
        record = distribution_for(obj) if obj else None
        if record is None:
            return configuration_error() or ('本地测试模式；勾选并保存后向频道发送测试消息，不附阅读链接。' if local_test_mode() else '未发送；勾选后在发布并保存时加入队列。')
        text = ('本地测试 · ' if record.is_test else '') + record.get_status_display()
        if record.sent_at:
            from django.utils import timezone
            sent = timezone.localtime(record.sent_at) if timezone.is_aware(record.sent_at) else record.sent_at
            text += f' · {sent:%Y-%m-%d %H:%M}'
        if record.last_error:
            labels = {
                'publisher_not_configured': '发布机器人、频道或公开域名配置不完整',
                'telegram_rate_limited': '平台限流，等待重试',
                'telegram_chat_not_found': '找不到频道，请检查频道配置及机器人权限',
                'telegram_chat_permission_denied': '机器人没有频道发帖权限',
                'telegram_invalid_message_format': '平台未接受消息格式',
                'telegram_http_401': '机器人凭据无效',
                'telegram_http_403': '机器人无权访问频道',
                'telegram_delivery_unknown': '网络或响应异常，无法确认是否送达',
                'delivery_interrupted_check_channel': '发送进程中断，无法确认是否送达',
                'expired before delivery': '任务超过有效期',
                'attempt_limit': '已达到重试次数上限',
                'publication_mode_changed': '运行环境已改变，请重新保存发送选择',
            }
            text += ' · ' + labels.get(record.last_error, '投递失败，请检查频道配置及发送队列')
        if record.status == 'unknown':
            text += '；请先检查频道，确认未发送后再重试。'
        return text

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        from notifications.publishing import save_distribution
        try:
            save_distribution(obj, form.cleaned_data.get('telegram_publish', False), form.cleaned_data.get('telegram_retry', False))
        except Exception as error:
            import logging
            from django.contrib import messages
            logging.getLogger(__name__).warning('Article distribution enqueue failed: %s', type(error).__name__)
            self.message_user(request, '文章已保存，但频道发送任务未能保存，请检查队列及数据库后重新勾选发送。', level=messages.WARNING)

    def delete_queryset(self, request, queryset):
        from django.db import transaction
        from .signals import media_cleanup_batch
        with transaction.atomic(), media_cleanup_batch():
            super().delete_queryset(request, queryset)


class BookModelAdmin(ArticleModelAdmin):
    list_display = ('cover_preview', 'book_summary', 'pdf_status', 'publication_status', '总浏览量', '更新时间')
    list_display_links = ('book_summary',)

    @admin.display(description='封面')
    def cover_preview(self, obj):
        cover = getattr(obj, '图片', None)
        if not cover or cover.name in ('null', 'None'):
            return format_html('<span class="admin-library-cover-frame admin-library-cover-empty" title="暂无封面"><span class="material-symbols-outlined" aria-hidden="true">menu_book</span><span>{}</span></span>', '无封面')
        # HTML dimensions remain a safe fallback if CSS is missing or cached.
        return format_html('<span class="admin-library-cover-frame"><img class="admin-library-cover" width="40" height="56" src="{}" alt="{}" loading="lazy" decoding="async"></span>',
                           cover.url, obj.标题)

    @admin.display(description='标题与作者', ordering='标题')
    def book_summary(self, obj):
        author = obj.作者 if obj.作者 and obj.作者 != '无作者信息' else '未标注作者'
        isbn = getattr(obj, 'ISBN', '')
        isbn_text = f' · ISBN {isbn}' if isbn and isbn != '暂无' else ''
        return format_html('<span class="admin-library-book-title" title="{}">{}</span><span class="admin-library-book-meta" title="{}{}">{}{}</span>',
                           obj.标题, obj.标题, author, isbn_text, author, isbn_text)

    @admin.display(description='发布状态', ordering='发布状态')
    def publication_status(self, obj):
        return admin_badge('已发布' if obj.发布状态 else '未发布', 'published' if obj.发布状态 else 'draft')

    @admin.display(description='PDF关联')
    def pdf_status(self, obj):
        if not any(field.name == '文档' for field in self.model._meta.fields):
            return '不适用'
        document = obj.文档
        # Linked is not a claim that storage has been probed; avoid per-row I/O.
        linked = bool(document and document.name not in ('null', 'None'))
        return admin_badge('已关联 PDF' if linked else '未关联 PDF', 'file' if linked else 'missing')


@admin.register(通讯)
class 通讯Admin(ArticleModelAdmin):
    pass


class 书讯SaleInline(StackedInline):
    model = 书讯Sale
    can_delete = False
    verbose_name_plural = '售卖设置'
    fields = ('is_active', 'sale_price')
    extra = 0


@admin.register(书讯)
class 书讯Admin(BookModelAdmin):
    list_display = ('cover_preview', 'book_summary', 'publication_status', 'sale_status', '总浏览量', '更新时间')
    inlines = [书讯SaleInline]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('sale_info')

    @admin.display(boolean=True, description='公开售卖')
    def sale_status(self, obj):
        return bool(getattr(getattr(obj, 'sale_info', None), 'is_active', False))


@admin.register(书评_分类)
class 书评_分类Admin(LibraryModelAdmin):
    list_display = ('名称',)
    search_fields = ('名称',)


@admin.register(书评)
class 书评Admin(ArticleModelAdmin):
    list_display = ('标题', '作者', '分类', 'likes', '总浏览量', '更新时间', '发布状态')
    list_filter = ('分类', '发布状态', '更新时间')
    list_select_related = ('分类',)


@admin.register(观点)
class 观点Admin(ArticleModelAdmin):
    pass


@admin.register(文艺)
class 文艺Admin(ArticleModelAdmin):
    pass


@admin.register(译林)
class 译林Admin(ArticleModelAdmin):
    search_fields = ('标题', '作者', '原文标题', '原文作者')


@admin.register(文史)
class 文史Admin(ArticleModelAdmin):
    pass


@admin.register(论文)
class 论文Admin(BookModelAdmin):
    pass


@admin.register(古籍)
class 古籍Admin(BookModelAdmin):
    pass


@admin.register(书库)
class 书库Admin(BookModelAdmin):
    # Covers continue to be generated from PDFs rather than edited independently.
    exclude = ('图片', *ArticleModelAdmin.exclude)


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
class FeedbackAdmin(LibraryModelAdmin):
    list_display = ('姓名', 'author', '邮箱', '提交时间', '已处理', '处理状态')
    list_select_related = ('author',)
    list_filter = ('已处理', '提交时间')
    search_fields = ('姓名', '邮箱', '建议内容')
    readonly_fields = ('author', '姓名', '邮箱', '建议内容', '提交时间')
    actions = [mark_as_processed, mark_as_unprocessed]
    ordering = ('-提交时间', '-pk')
    date_hierarchy = '提交时间'
    fieldsets = (
        ('反馈信息', {
            'fields': ('author', '姓名', '邮箱', '建议内容', '提交时间')
        }),
        ('处理状态', {
            'fields': ('已处理', '处理备注')
        }),
    )
    
    def has_add_permission(self, request):
        """禁止在admin中添加新的反馈"""
        return False
    
    def 处理状态(self, obj):
        return admin_badge('已处理' if obj.已处理 else '待处理', 'published' if obj.已处理 else 'draft')
    处理状态.short_description = '状态'
