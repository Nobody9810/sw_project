from django.contrib import admin
from django import forms
from shuwei.admin_base import LibraryModelAdmin
from .models import UserReaction, ViewCount, ViewRecord
from shuwei.dates import local_date
from .services import edit_view_counts


class ViewCountForm(forms.ModelForm):
    class Meta:
        model = ViewCount
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk and self.instance.最后统计日期 != local_date():
            self.initial['今日浏览量'] = 0

    def clean(self):
        data = super().clean()
        total, today = data.get('总浏览量'), data.get('今日浏览量')
        if total is not None and today is not None and today > total:
            self.add_error('今日浏览量', '今日浏览量不能大于总浏览量。')
        return data


class AccountIdentityFilter(admin.SimpleListFilter):
    title = '身份'
    parameter_name = 'account_identity'

    def lookups(self, request, model_admin):
        return [('account', '登录用户'), ('unlinked', '访客／未关联')]

    def queryset(self, request, queryset):
        if self.value() in ('account', 'unlinked'):
            return queryset.filter(user__isnull=self.value() == 'unlinked')
        return queryset


class AccountDisplayMixin:
    def get_readonly_fields(self, request, obj=None):
        fields = super().get_readonly_fields(request, obj)
        return fields if obj is not None else tuple(field for field in fields if field != 'user_session')

    @admin.display(description='用户名', ordering='user__first_name')
    def account_name(self, obj):
        if obj.user_id:
            return obj.user.first_name.strip() or f'读者 #{obj.user_id}'
        return '未记录'

    @admin.display(description='身份')
    def account_identity(self, obj):
        if obj.user_id:
            return '登录用户'
        if getattr(obj, 'identity_key', '').startswith('user:'):
            return '账户已删除'
        return '访客／未关联'

    @admin.display(description='身份说明')
    def account_help(self, obj):
        if obj.user_id:
            return f'账户ID：{obj.user_id}。用户名显示当前账户昵称，记录归属不随昵称变化。'
        return '没有可确认的账户关联，可能是访客、历史记录或已删除账户；不按昵称或邮箱推测归属。'


@admin.register(UserReaction)
class UserReactionAdmin(AccountDisplayMixin, LibraryModelAdmin):
    list_display = ('account_name', 'account_identity', 'reaction_type', 'content_type', 'object_id', 'created_at')
    list_filter = (AccountIdentityFilter, 'reaction_type', 'content_type', 'created_at')
    search_fields = ('user__first_name', 'user__username', 'user_session')
    readonly_fields = ('account_name', 'account_identity', 'account_help', 'user_session', 'created_at')
    fields = ('account_name', 'account_identity', 'account_help', 'user_session', 'reaction_type', 'content_type', 'object_id', 'created_at')
    list_select_related = ('content_type', 'user')
    ordering = ('-created_at', '-pk')


@admin.register(ViewCount)
class ViewCountAdmin(LibraryModelAdmin):
    form = ViewCountForm
    list_display = ('content_type', 'object_id', '总浏览量', 'current_today_views', '最后统计日期')
    list_filter = ('最后统计日期', 'content_type')
    search_fields = ('object_id',)
    readonly_fields = ('content_type', 'object_id', '最后统计日期')
    list_select_related = ('content_type',)
    ordering = ('-最后统计日期', '-pk')

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        # Deleting only this row would restore the article's legacy counters.
        return False

    def has_change_permission(self, request, obj=None):
        if not super().has_change_permission(request, obj):
            return False
        # Historical orphan rows remain inspectable, but cannot be edited.
        return obj is None or obj.content_object is not None

    def save_model(self, request, obj, form, change):
        edit_view_counts(obj.pk, obj.总浏览量, obj.今日浏览量)
        obj.refresh_from_db()

    @admin.display(description='今日浏览量')
    def current_today_views(self, obj):
        return obj.今日浏览量 if obj.最后统计日期 == local_date() else 0


@admin.register(ViewRecord)
class ViewRecordAdmin(AccountDisplayMixin, LibraryModelAdmin):
    list_display = ('account_name', 'account_identity', 'content_type', 'object_id', 'viewed_at', 'ip_address')
    list_filter = (AccountIdentityFilter, 'viewed_at', 'content_type')
    search_fields = ('user__first_name', 'user__username', 'user_session', 'ip_address')
    readonly_fields = ('account_name', 'account_identity', 'account_help', 'user_session', 'viewed_at')
    fields = ('account_name', 'account_identity', 'account_help', 'user_session', 'content_type', 'object_id', 'viewed_at', 'ip_address')
    date_hierarchy = 'viewed_at'
    list_select_related = ('content_type', 'user')
    ordering = ('-viewed_at', '-pk')
