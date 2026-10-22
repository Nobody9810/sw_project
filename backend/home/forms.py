from django import forms
from django.forms import ModelForm
from home.models import Contact
from django.core.files.uploadedfile import UploadedFile
from django.db.models import ImageField
from .uploads import validate_upload


class ArticleAdminForm(ModelForm):
    from unfold.widgets import UnfoldBooleanWidget

    telegram_publish = forms.BooleanField(label='发布到 Telegram 频道', required=False,
        widget=UnfoldBooleanWidget,
        help_text='正式发布后异步发送一次；修改文章不会重复发送。取消勾选不会撤回已发送消息。')
    telegram_retry = forms.BooleanField(label='重新尝试失败的发送', required=False,
        widget=UnfoldBooleanWidget,
        help_text='仅用于失败或结果待确认的记录。请先检查频道，避免重复；已成功发送的文章不会再次发送。')

    class Meta:
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from notifications.publishing import distribution_for, local_test_mode
        if local_test_mode():
            self.fields['telegram_publish'].label = '发送到 Telegram 频道（本地测试）'
            self.fields['telegram_publish'].help_text = '发送标有“本地测试”的消息，不附阅读链接。请确认接收频道；修改文章不会重复发送。正式上线后可另行正式推送。'
        record = distribution_for(self.instance)
        self.initial['telegram_publish'] = bool(record and record.enabled)
        self.fields['telegram_retry'].disabled = not record or record.status not in ('failed', 'unknown')

    def clean(self):
        data = super().clean()
        from notifications.publishing import configuration_error
        if data.get('telegram_publish') and data.get('发布状态'):
            error = configuration_error()
            if error:
                self.add_error('telegram_publish', error)
        for name, value in list(data.items()):
            if isinstance(value, UploadedFile):
                try:
                    validate_upload(value, image_only=isinstance(self._meta.model._meta.get_field(name), ImageField))
                except forms.ValidationError as exc:
                    self.add_error(name, exc)
        return data

class ContactForm(ModelForm):
    class Meta:
        model = Contact
        fields = '__all__'



