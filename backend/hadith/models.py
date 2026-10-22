
from django.db import models
from uuid import uuid4
from .ordering import chapter_order, number_order


def collection_key():
    """Internal identifier for collections created manually in the admin."""
    return 'Custom' + uuid4().hex[:14]


class HadithCollection(models.Model):
    """圣训集及其版本信息。"""
    name = models.CharField(max_length=100, unique=True, verbose_name="圣训集全称")
    short_name = models.CharField(max_length=20, unique=True, default=collection_key, editable=False, verbose_name="内部标识")
    introduction = models.TextField(blank=True, default='', verbose_name='圣训集介绍')
    author = models.CharField(max_length=200, blank=True, default='', verbose_name='作者／辑录者')
    translator = models.CharField(max_length=200, blank=True, default='', verbose_name='译者')
    publisher = models.CharField(max_length=200, blank=True, default='', verbose_name='出版社')
    publication_date = models.CharField(max_length=100, blank=True, default='', verbose_name='出版时间')
    isbn = models.CharField(max_length=32, blank=True, default='', verbose_name='ISBN')
    source_version = models.TextField(blank=True, default='', verbose_name='本站采用版本')
    data_quality = models.JSONField(default=dict, blank=True, verbose_name='数据校对状态')
    history = models.TextField(blank=True, default='', verbose_name='圣训集历史')
    history_source = models.URLField(blank=True, default='', verbose_name='历史介绍参考来源')
    total_hadiths = models.PositiveIntegerField(default=0, verbose_name="总条数")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "圣训集"
        verbose_name_plural = "圣训集管理"


class Hadith(models.Model):
    """单条圣训"""
    collection = models.ForeignKey(
        HadithCollection,
        on_delete=models.CASCADE,
        related_name='hadiths',
        verbose_name="所属圣训集"
    )
    chapter = models.CharField(max_length=200, verbose_name="章节标题")
    collection_number = models.CharField(max_length=30, verbose_name="本集编号")  # 关键！改成这个
    text = models.TextField(verbose_name="正文")
    reading = models.JSONField(null=True, blank=True, default=None, editable=False,
                               verbose_name='已入库阅读结构')
    reading_search = models.TextField(blank=True, default='', editable=False,
                                     verbose_name='阅读正文及注释检索')

    chapter_order = models.PositiveIntegerField(default=0, editable=False)
    number_order = models.PositiveIntegerField(default=0, editable=False)

    def save(self, *args, **kwargs):
        fields = kwargs.get('update_fields')
        identity_fields = {'chapter', 'collection_number'}
        # Imported records have explicit source order. Editing prose must not
        # replace it with digits flattened from a chapter-qualified identifier.
        previous = None
        if not self._state.adding and (fields is None or identity_fields.intersection(fields)):
            previous = type(self).objects.filter(pk=self.pk).values('chapter', 'collection_number').first()
        changed = set()
        if self._state.adding or ((fields is None or 'chapter' in fields) and
                                  (previous is None or previous['chapter'] != self.chapter)):
            self.chapter_order = chapter_order(self.chapter)
            changed.add('chapter_order')
        if self._state.adding or ((fields is None or 'collection_number' in fields) and
                                  (previous is None or previous['collection_number'] != self.collection_number)):
            self.number_order = number_order(self.collection_number)
            changed.add('number_order')
        if fields is not None:
            kwargs['update_fields'] = set(fields) | changed
        super().save(*args, **kwargs)

    class Meta:
        indexes = [models.Index(fields=['collection', 'chapter_order', 'number_order'], name='hadith_numeric_order')]
        verbose_name = "圣训"
        verbose_name_plural = "全部圣训"
        # 同一集内编号唯一，不同圣训集可使用相同编号。
        unique_together = ['collection', 'collection_number']
        ordering = ['collection', 'chapter_order', 'number_order', 'id']

    def __str__(self):
        return f"{self.collection.short_name} {self.collection_number}: {self.chapter}"

    # 方便前端显示
    def display_number(self):
        return f"{self.collection.short_name} {self.collection_number}"
