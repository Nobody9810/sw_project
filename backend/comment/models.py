from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.conf import settings
from django.urls import reverse


class Comment(models.Model):
    """评论模型"""
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        verbose_name="内容类型"
    )
    object_id = models.PositiveIntegerField(verbose_name="对象ID")
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # 评论内容
    user_name = models.CharField(max_length=50, verbose_name="用户名")
    user_email = models.EmailField(verbose_name="邮箱")
    comment = models.TextField(verbose_name="评论内容")
    
    # 回复相关
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='replies',
        verbose_name="父评论"
    )
    level = models.PositiveIntegerField(default=0, verbose_name="层级")
    thread_id = models.PositiveIntegerField(null=True, blank=True, verbose_name="线程ID")
    order = models.PositiveIntegerField(default=0, verbose_name="排序")
    
    # 状态
    is_public = models.BooleanField(default=False, verbose_name="是否公开")
    is_removed = models.BooleanField(default=False, verbose_name="是否删除")
    
    # 时间戳
    submit_date = models.DateTimeField(auto_now_add=True, verbose_name="提交时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")
    
    # 站点
    site_id = models.PositiveIntegerField(default=1, verbose_name="站点ID")
    
    class Meta:
        ordering = ['thread_id', 'order', 'submit_date']
        indexes = [
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['thread_id']),
            models.Index(fields=['is_public', 'is_removed']),
        ]
        verbose_name = "评论"
        verbose_name_plural = "评论"
    
    def __str__(self):
        return f"{self.user_name} - {self.comment[:50]}"
    
    def save(self, *args, **kwargs):
        # 先保存以获取 ID
        is_new = not self.pk
        super().save(*args, **kwargs)
        
        # 如果是回复，设置 thread_id 和 level
        if self.parent:
            if not self.thread_id:
                self.thread_id = self.parent.thread_id or self.parent.id
            if self.parent.level is not None:
                self.level = self.parent.level + 1
            else:
                self.level = 1
            # 如果更新了字段，需要再次保存
            if is_new or not self.thread_id or self.level != (self.parent.level + 1 if self.parent.level is not None else 1):
                super().save(update_fields=['thread_id', 'level'])
        elif is_new and not self.thread_id:
            # 如果是新评论且没有父评论，设置 thread_id 为自己
            self.thread_id = self.id
            super().save(update_fields=['thread_id'])
    
    def get_absolute_url(self):
        """获取评论的绝对URL"""
        return reverse('comment:detail', kwargs={'pk': self.pk})

