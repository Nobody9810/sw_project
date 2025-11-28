from django.db import models
from django_ckeditor_5.fields import CKEditor5Field
from sorl.thumbnail import ImageField
from django.urls import reverse
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

# UserReaction 模型已迁移到 interactions app
# 如需使用，请从 interactions.models 导入


class 总类(models.Model):
    """基础文章类"""
    标题 = models.CharField(
        max_length=150,
    )
    内容 = CKEditor5Field(
        null=True, 
        blank=True, 
        default="暂无内容简介",
        config_name='default'
    )
    更新时间 = models.DateTimeField(
        auto_now=True,

    )
    发布状态 = models.BooleanField(
        default=False,
        verbose_name="发布状态",
        help_text="是否发布"
    )
    作者 = models.CharField(
        max_length=200, 
        null=True, 
        blank=True, 
        default="无作者信息",

    )
    likes = models.PositiveIntegerField(
        default=0, 
        db_index=True,
        verbose_name="点赞数"
    )
    dislikes = models.PositiveIntegerField(
        default=0, 
        db_index=True,
        verbose_name="点踩数"
    )
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
        abstract = True
        ordering = ['-更新时间']
        verbose_name = "基础文章"
        verbose_name_plural = "基础文章"

    def __str__(self):
        return self.标题
    
    def get_absolute_url(self):
        """获取文章详情页URL"""
        return reverse(f'home:{self._meta.model_name}detail', args=[str(self.id)])

class 通讯(总类):
    图片 = ImageField(
        upload_to='images/tongxun/',
        blank=True,
        null=True,
        verbose_name="图片"
    )
    资源 = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        default="无资源信息",
        verbose_name="资源链接"
    )

    class Meta:
        verbose_name = "通讯"
        verbose_name_plural = "通讯"

class 书讯(总类):
    作者简介 = CKEditor5Field(
        null=True,
        blank=True,
        default="暂无作者简介",
        verbose_name="作者简介",
        config_name='default'
    )
    目录 = CKEditor5Field(
        null=True,
        blank=True,
        default="暂无",
        verbose_name="目录",
        config_name='default'
    )
    前言 = CKEditor5Field(
        null=True,
        blank=True,
        default="暂无",
        verbose_name="前言",
        config_name='default'
    )
    ISBN = models.CharField(
        max_length=30,
        null=True,
        blank=True,
        default="暂无",
        verbose_name="ISBN"
    )
    出版社 = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        default="暂无",
        verbose_name="出版社"
    )
    出版年 = models.DateField(
        null=True,
        blank=True,
        verbose_name="出版年份"
    )
    定价 = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        default="暂无",
        verbose_name="定价"
    )
    页数 = models.IntegerField(
        null=True,
        blank=True,
        verbose_name="页数"
    )
    装帧 = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        default="暂无",
        verbose_name="装帧"
    )
    图片 = ImageField(
        upload_to='images/shuxun/',
        blank=True,
        null=True,
        verbose_name="封面图片"
    )

    class Meta:
        verbose_name = "书讯"
        verbose_name_plural = "书讯"

class 书评_分类(models.Model):
    名称 = models.CharField(max_length=100)

    def __str__(self):
        return self.名称

    class Meta:
        verbose_name = "书评分类"
        verbose_name_plural = "书评分类"

class 书评(总类):
    书籍出版日期 = models.DateField(
        null=True,
        blank=True,
        verbose_name="书籍出版日期"
    )
    出处 = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        verbose_name="出处"
    )
    图片 = ImageField(
        upload_to='images/shuping/',
        blank=True,
        null=True,
        verbose_name="图片"
    )
    分类 = models.ForeignKey(
        书评_分类, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        verbose_name="分类"
    )

    class Meta:
        verbose_name = "书评"
        verbose_name_plural = "书评"

class 观点(总类):
    出处 = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="出处"
    )
    图片 = ImageField(
        upload_to='images/guandian/',
        blank=True,
        null=True,
        verbose_name="图片"
    )

    class Meta:
        verbose_name = "观点"
        verbose_name_plural = "观点"

class 文艺(总类):
    出处 = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="出处"
    )
    图片 = ImageField(
        upload_to='images/wenyi/',
        blank=True,
        null=True,
        verbose_name="图片"
    )

    class Meta:
        verbose_name = "文艺"
        verbose_name_plural = "文艺"

class 译林(总类):
    原文标题 = models.CharField(
        max_length=150,
        verbose_name="原文标题"
    )
    原文作者 = models.CharField(
        max_length=100, 
        null=True, 
        blank=True,
        verbose_name="原文作者"
    )
    原文出版日期 = models.DateField(
        null=True,
        blank=True,
        verbose_name="原文出版日期",
    )
    图片 = ImageField(
        upload_to='images/yiling/', 
        blank=True, 
        null=True,
        verbose_name="图片"
    )

    class Meta:
        verbose_name = "译林"
        verbose_name_plural = "译林"

class 文史(总类):
    图片 = ImageField(
        upload_to='images/wenshi/', 
        blank=True, 
        null=True,
        verbose_name="图片"
    )
    资源 = models.CharField(
        max_length=200, 
        null=True, 
        blank=True,
        verbose_name="资源链接"
    )

    class Meta:
        verbose_name = "文史"
        verbose_name_plural = "文史"

class 论文(总类):
    图片 = ImageField(
        upload_to='images/lunwen/', 
        default='null', 
        null=True,
    )
    文档 = models.FileField(
        upload_to='pdf/lunwen/', 
        default='null', 
        null=True,
        verbose_name="PDF文档"
    )
    内容 = None

    class Meta:
        verbose_name = "论文"
        verbose_name_plural = "论文"

class 古籍(总类):
    文档 = models.FileField(
        upload_to='pdf/guji/',
        verbose_name="PDF文档"
    )
    内容 = None

    class Meta:
        verbose_name = "古籍"
        verbose_name_plural = "古籍"

class 书库(总类):
    文档 = models.FileField(
        upload_to='pdf/shuku/',
        verbose_name="PDF文档"
    )
    作者简介 = CKEditor5Field(
        null=True,
        blank=True,
        default="暂无",
        verbose_name="作者简介",
        config_name='default'
    )
    内容简介 = CKEditor5Field(
        null=True,
        blank=True,
        default="暂无",
        verbose_name="内容简介",
        config_name='default'
    )
    出版日期 = models.DateField(
        null=True,
        blank=True,
        verbose_name="出版日期"
    )
    图片 = ImageField(
        upload_to='images/shuku/', 
        default='null', 
        null=True,
        verbose_name="封面图片"
    )
    ISBN = models.CharField(
        max_length=30,
        verbose_name="ISBN"
    )

    class Meta:
        verbose_name = "书库"
        verbose_name_plural = "书库"

class Contact(models.Model):
    邮箱 = models.EmailField(
        null=False, 
        blank=False,
        verbose_name="邮箱"
    )
    主题 = models.CharField(
        max_length=255,
        verbose_name="主题"
    )
    内容 = models.TextField(
        null=False, 
        blank=False,
        verbose_name="内容"
    )

    class Meta:
        verbose_name = "联系我们"
        verbose_name_plural = "联系我们"

    def __str__(self):
        return self.邮箱


class Feedback(models.Model):
    """用户反馈/建议模型"""
    姓名 = models.CharField(
        max_length=100,
        null=False,
        blank=False,
        verbose_name="姓名"
    )
    邮箱 = models.EmailField(
        null=False,
        blank=False,
        verbose_name="邮箱"
    )
    建议内容 = models.TextField(
        null=False,
        blank=False,
        verbose_name="建议内容"
    )
    提交时间 = models.DateTimeField(
        auto_now_add=True,
        verbose_name="提交时间"
    )
    已处理 = models.BooleanField(
        default=False,
        verbose_name="已处理"
    )
    处理备注 = models.TextField(
        null=True,
        blank=True,
        verbose_name="处理备注"
    )

    class Meta:
        verbose_name = "用户反馈"
        verbose_name_plural = "用户反馈"
        ordering = ['-提交时间']

    def __str__(self):
        return f"{self.姓名} - {self.提交时间.strftime('%Y-%m-%d %H:%M')}"
