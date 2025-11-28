
from django.db import models

class HadithCollection(models.Model):
    """圣训集（布哈里、穆斯林、提尔米兹……）"""
    name = models.CharField(max_length=100, unique=True, verbose_name="圣训集全称")
    short_name = models.CharField(max_length=20, unique=True, verbose_name="简称")
    arabic_name = models.CharField(max_length=100, blank=True, verbose_name="阿拉伯文名称")
    description = models.TextField(blank=True, verbose_name="简介")
    total_hadiths = models.PositiveIntegerField(default=0, verbose_name="总条数")
    is_sahih = models.BooleanField(default=False, verbose_name="是否两大真本")  # 布哈里、穆斯林打钩

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

    class Meta:
        verbose_name = "圣训"
        verbose_name_plural = "全部圣训"
        # 同一集内编号唯一（布哈里1、穆斯林1可共存）
        unique_together = ['collection', 'collection_number']
        ordering = ['collection', 'chapter', 'collection_number']

    def __str__(self):
        return f"{self.collection.short_name} {self.collection_number}: {self.chapter}"

    # 方便前端显示
    def display_number(self):
        return f"{self.collection.short_name} {self.collection_number}"