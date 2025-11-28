from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from datetime import timedelta


class UserReaction(models.Model):
    """用户反应（点赞/踩）记录"""
    REACTION_CHOICES = (
        ('like', '点赞'),
        ('dislike', '踩')
    )
    
    user_session = models.CharField(
        max_length=40, 
        db_index=True,
        verbose_name="用户会话ID"
    )
    reaction_type = models.CharField(
        max_length=10, 
        choices=REACTION_CHOICES,
        verbose_name="反应类型"
    )
    content_type = models.ForeignKey(
        ContentType, 
        on_delete=models.CASCADE,
        verbose_name="内容类型"
    )
    object_id = models.PositiveIntegerField(verbose_name="对象ID")
    content_object = GenericForeignKey('content_type', 'object_id')
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="创建时间"
    )
    
    class Meta:
        unique_together = ['user_session', 'content_type', 'object_id']
        indexes = [
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['user_session']),
        ]
        verbose_name = "用户反应记录"
        verbose_name_plural = "用户反应记录"

    def __str__(self):
        return f"{self.user_session} - {self.get_reaction_type_display()} - {self.content_object}"


class ViewCount(models.Model):
    """浏览量统计模型"""
    content_type = models.ForeignKey(
        ContentType, 
        on_delete=models.CASCADE,
        verbose_name="内容类型"
    )
    object_id = models.PositiveIntegerField(verbose_name="对象ID")
    content_object = GenericForeignKey('content_type', 'object_id')
    
    总浏览量 = models.PositiveIntegerField(
        default=0,
        db_index=True,
        verbose_name="总浏览量"
    )
    今日浏览量 = models.PositiveIntegerField(
        default=0,
        db_index=True,
        verbose_name="今日浏览量"
    )
    最后统计日期 = models.DateField(
        auto_now=True,
        verbose_name="最后统计日期"
    )
    
    class Meta:
        unique_together = ['content_type', 'object_id']
        indexes = [
            models.Index(fields=['content_type', 'object_id']),
        ]
        verbose_name = "浏览量统计"
        verbose_name_plural = "浏览量统计"
    
    def __str__(self):
        return f"{self.content_object} - 总浏览量: {self.总浏览量}, 今日: {self.今日浏览量}"


class ViewRecord(models.Model):
    """访问记录模型 - 用于防止重复计算浏览量"""
    user_session = models.CharField(
        max_length=40,
        db_index=True,
        verbose_name="用户会话ID"
    )
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        verbose_name="内容类型"
    )
    object_id = models.PositiveIntegerField(verbose_name="对象ID")
    content_object = GenericForeignKey('content_type', 'object_id')
    viewed_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="访问时间"
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name="IP地址"
    )
    
    class Meta:
        # 不设置 unique_together，允许同一用户对同一内容有多条访问记录
        indexes = [
            models.Index(fields=['content_type', 'object_id', 'viewed_at']),
            models.Index(fields=['user_session', 'content_type', 'object_id', 'viewed_at']),
            models.Index(fields=['user_session', 'viewed_at']),
        ]
        verbose_name = "访问记录"
        verbose_name_plural = "访问记录"
        ordering = ['-viewed_at']
    
    def __str__(self):
        return f"{self.user_session} - {self.content_object} - {self.viewed_at}"
    
    @classmethod
    def should_count_view(cls, user_session, content_type, object_id, time_window_minutes=30):
        """
        检查是否应该计算浏览量
        策略：同一Session在指定时间窗口内（默认30分钟）只计算一次
        """
        time_threshold = timezone.now() - timedelta(minutes=time_window_minutes)
        
        # 获取最近一条访问记录
        recent_view = cls.objects.filter(
            user_session=user_session,
            content_type=content_type,
            object_id=object_id,
            viewed_at__gte=time_threshold
        ).order_by('-viewed_at').first()
        
        # 如果时间窗口内没有访问记录，或者最近一次访问已经超过时间窗口，则应该计算
        return recent_view is None
