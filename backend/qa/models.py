from django.db import models
from django.conf import settings

class Question(models.Model):
    STATUS_CHOICES = [
        ('draft', '待审核'),
        ('published', '已发布'),
        ('rejected', '已拒绝'),
    ]

    content = models.TextField(verbose_name='问题')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, verbose_name='提问者', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name='状态')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '问题'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return self.content[:50] + '...' if len(self.content) > 50 else self.content

class Answer(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers', verbose_name='问题')
    content = models.TextField(verbose_name='回复')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, verbose_name='回答者', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='回答时间')
    is_accepted = models.BooleanField(default=False, verbose_name='是否采纳')

    class Meta:
        verbose_name = '回答'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return f"Answer to {self.question.content[:20]}..."
