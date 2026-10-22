from django import forms
from .models import Comment


class CommentForm(forms.ModelForm):
    """评论表单"""
    name = forms.CharField(max_length=50, label='昵称', required=False)
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
    
    def __init__(self, content_object=None, *args, user=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.content_object = content_object
        if user is not None and user.is_authenticated:
            # Ignore even malformed/spoofed identity fields from an authenticated caller.
            self.fields.pop('name')
        else:
            self.fields['name'].required = True
    
    def clean_comment(self):
        comment = self.cleaned_data.get('comment', '').strip()
        if not comment:
            raise forms.ValidationError('评论内容不能为空')
        if len(comment) > 3000:
            raise forms.ValidationError('评论内容不能超过3000个字符')
        return comment
    

