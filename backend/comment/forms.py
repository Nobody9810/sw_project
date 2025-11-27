from django import forms
from django.contrib.contenttypes.models import ContentType
from .models import Comment
import re


class CommentForm(forms.ModelForm):
    """评论表单"""
    name = forms.CharField(
        max_length=50,
        label="称呼",
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': '请输入您的称呼'
        })
    )
    email = forms.EmailField(
        label="邮箱",
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': '请输入您的邮箱'
        })
    )
    comment = forms.CharField(
        label="评论内容",
        widget=forms.Textarea(attrs={
            'class': 'form-control',
            'rows': 5,
            'placeholder': '请输入您的评论'
        })
    )
    reply_to = forms.IntegerField(
        required=False,
        widget=forms.HiddenInput()
    )
    
    class Meta:
        model = Comment
        fields = ['comment']
    
    def __init__(self, content_object=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.content_object = content_object
    
    def clean_comment(self):
        comment = self.cleaned_data.get('comment', '').strip()
        if not comment:
            raise forms.ValidationError('评论内容不能为空')
        if len(comment) > 3000:
            raise forms.ValidationError('评论内容不能超过3000个字符')
        return comment
    
    def clean_email(self):
        email = self.cleaned_data.get('email', '').strip()
        if not email:
            raise forms.ValidationError('邮箱不能为空')
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            raise forms.ValidationError('请输入有效的邮箱地址')
        return email
    
    def clean_name(self):
        name = self.cleaned_data.get('name', '').strip()
        if not name:
            raise forms.ValidationError('称呼不能为空')
        if len(name) > 50:
            raise forms.ValidationError('称呼不能超过50个字符')
        return name

