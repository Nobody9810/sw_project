from django.db import models
from uuid import uuid4


class ArticleDistribution(models.Model):
    """One opt-in Telegram publication per article, separate from private moderation."""
    content_type = models.ForeignKey('contenttypes.ContentType', on_delete=models.CASCADE)
    object_id = models.PositiveBigIntegerField()
    enabled = models.BooleanField('发布到 Telegram 频道', default=False)
    is_test = models.BooleanField('本地测试', default=False, editable=False)
    status = models.CharField('状态', max_length=16, default='idle', choices=[
        ('idle', '未发送'), ('queued', '等待发送'), ('sending', '发送中'),
        ('sent', '已发送'), ('failed', '发送失败'), ('unknown', '结果待确认')])
    generation = models.UUIDField(default=uuid4, editable=False)
    outbox = models.ForeignKey('notifications.OutboundMessage', null=True, blank=True,
                               on_delete=models.SET_NULL, related_name='+')
    message_id = models.BigIntegerField(null=True, editable=False)
    destination = models.CharField(max_length=200, blank=True, editable=False)
    sent_at = models.DateTimeField('发送时间', null=True, editable=False)
    last_error = models.CharField('错误代码', max_length=200, blank=True, editable=False)

    class Meta:
        verbose_name = '文章频道分发'
        verbose_name_plural = verbose_name
        constraints = [models.UniqueConstraint(fields=['content_type', 'object_id'], name='article_distribution_unique')]


class OutboundMessage(models.Model):
    """One external message waiting for the worker; requests only insert rows."""
    PENDING, SENDING, FAILED = 'pending', 'sending', 'failed'
    STATUS_CHOICES = [(PENDING, '待发送'), (SENDING, '发送中'), (FAILED, '已放弃')]

    channel = models.CharField('渠道', max_length=32)
    # Rendered content, e.g. a login code. Deleted after delivery and cleared on failure.
    payload = models.JSONField('内容', default=dict)
    status = models.CharField('状态', max_length=16, choices=STATUS_CHOICES, default=PENDING)
    attempts = models.PositiveSmallIntegerField('尝试次数', default=0)
    available_at = models.DateTimeField('可发送时间', db_index=True)
    expires_at = models.DateTimeField('过期时间')
    last_error = models.CharField('最后错误', max_length=200, blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)

    class Meta:
        verbose_name = '外部消息'
        verbose_name_plural = '发信队列'
        indexes = [models.Index(fields=['status', 'available_at'])]

    def __str__(self):
        return f'{self.channel} #{self.pk}'


class TelegramReview(models.Model):
    """Single-use review capability and audit, without comment text or reader email."""
    token = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    comment = models.OneToOneField('comment.Comment', on_delete=models.CASCADE, related_name='telegram_review', null=True, blank=True)
    question = models.OneToOneField('qa.Question', on_delete=models.CASCADE, related_name='telegram_review', null=True, blank=True)
    fingerprint = models.CharField(max_length=64)
    status = models.CharField(max_length=16, default='pending', choices=[
        ('pending', '待审核'), ('approved', '已通过'), ('rejected', '未通过'),
        ('superseded', '内容已变更'), ('expired', '已过期')])
    expires_at = models.DateTimeField(db_index=True)
    processed_by = models.PositiveBigIntegerField(null=True, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Telegram审核记录'
        verbose_name_plural = verbose_name
        constraints = [models.CheckConstraint(
            condition=(models.Q(comment__isnull=False, question__isnull=True) |
                       models.Q(comment__isnull=True, question__isnull=False)),
            name='telegram_review_one_target')]


class TelegramPollCursor(models.Model):
    """Durable update checkpoint and exclusive receiver lease, singleton pk=1."""
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    next_update = models.BigIntegerField(default=0)
    last_update_at = models.DateTimeField(null=True)
    lease_token = models.UUIDField(null=True, editable=False)
    lease_until = models.DateTimeField(null=True)
