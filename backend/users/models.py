from uuid import uuid4
from django.conf import settings
from django.db import models


def avatar_path(instance, filename):
    # Random names: the URL is public but reveals nothing about the account.
    return f'avatars/{uuid4().hex}.webp'


class UserProfile(models.Model):
    """A reader's public avatar. Nickname stays in User.first_name; nothing else is collected."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    avatar = models.FileField('上传的头像', upload_to=avatar_path, blank=True)
    avatar_preset = models.CharField('预设头像', max_length=32, blank=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '读者头像'
        verbose_name_plural = '读者头像'

    def __str__(self):
        return self.user.first_name or f'读者 #{self.user_id}'
