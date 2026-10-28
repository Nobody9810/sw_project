# home/serializers.py
from django.utils.html import strip_tags
from rest_framework import serializers
from .models import (
    通讯, 书讯, 书讯Sale, 书评, 观点, 文艺, 译林, 文史, 论文, 古籍, 书库,
)


# ========== 售卖信息 ==========

DEFAULT_SALE_INFO = {
    "is_active": False,
    "sale_price": None,
    "wechat_qr": None,
    "whatsapp_qr": None,
    "service_time": "",
}


def normalize_media_fields(data, instance):
    for name in ('图片', '文档'):
        if name not in data:
            continue
        file = getattr(instance, name, None)
        if getattr(file, 'name', None) in (None, '', 'null', 'None'):
            data[name] = None
        else:
            # Keep local media on the frontend's /media/ proxy. DRF otherwise
            # expands it to the API host, which browser PDF fetches cannot use
            # without CORS headers. Absolute CDN storage URLs stay unchanged.
            url = file.url
            if url.startswith('/') and not url.startswith('//'):
                data[name] = url
    return data


class BookSaleSerializer(serializers.ModelSerializer):
    sale_price = serializers.SerializerMethodField()

    class Meta:
        model = 书讯Sale
        fields = ["is_active", "sale_price",]

    def get_sale_price(self, obj):
        return str(obj.sale_price) if obj.sale_price is not None else None


def get_sale_info(obj):
    """从任意文章对象上取售卖信息，没有则返回默认关闭状态"""
    sale = getattr(obj, "sale_info", None)
    if sale is None:
        return DEFAULT_SALE_INFO
    return BookSaleSerializer(sale).data


def get_is_for_sale(obj):
    """只取一个轻量布尔值，供列表页用"""
    sale = getattr(obj, "sale_info", None)
    return bool(sale.is_active) if sale else False


# ========== 详情页序列化器 ==========

class BaseArticleSerializer(serializers.ModelSerializer):
    """“总类”抽象模型的公共字段"""
    app_label = serializers.SerializerMethodField()
    model_name = serializers.SerializerMethodField()

    def to_representation(self, instance):
        from .html import HTML_FIELDS, public_html
        data = super().to_representation(instance)
        for name in HTML_FIELDS:
            if name in data:
                data[name] = public_html(data[name])
        return normalize_media_fields(data, instance)

    class Meta:
        fields = [
            "id", "标题", "作者", "内容", "更新时间",
            "likes", "dislikes", "总浏览量", "今日浏览量",
            "app_label", "model_name",
        ]

    def get_app_label(self, obj):
        return obj._meta.app_label

    def get_model_name(self, obj):
        return obj._meta.model_name


# 论文、古籍模型把 内容 字段置为 None，序列化时要排除
_fields_no_content = [f for f in BaseArticleSerializer.Meta.fields if f != "内容"]


class TongXunSerializer(BaseArticleSerializer):
    class Meta(BaseArticleSerializer.Meta):
        model = 通讯
        fields = BaseArticleSerializer.Meta.fields + ["图片", "资源"]


class ShuXunSerializer(BaseArticleSerializer):
    """书讯详情，附带售卖信息"""
    sale_info = serializers.SerializerMethodField()

    class Meta(BaseArticleSerializer.Meta):
        model = 书讯
        fields = BaseArticleSerializer.Meta.fields + [
            "作者简介", "目录", "前言", "ISBN", "出版社", "出版年",
            "定价", "页数", "装帧", "图片", "sale_info",
        ]

    def get_sale_info(self, obj):
        return get_sale_info(obj)


class ShuPingSerializer(BaseArticleSerializer):
    分类名称 = serializers.CharField(source="分类.名称", default="", read_only=True)

    class Meta(BaseArticleSerializer.Meta):
        model = 书评
        fields = BaseArticleSerializer.Meta.fields + ["书籍出版日期", "出处", "图片", "分类", "分类名称"]


class GuanDianSerializer(BaseArticleSerializer):
    class Meta(BaseArticleSerializer.Meta):
        model = 观点
        fields = BaseArticleSerializer.Meta.fields + ["出处", "图片"]


class WenYiSerializer(BaseArticleSerializer):
    class Meta(BaseArticleSerializer.Meta):
        model = 文艺
        fields = BaseArticleSerializer.Meta.fields + ["出处", "图片"]


class YiLingSerializer(BaseArticleSerializer):
    原文出版日期 = serializers.DateTimeField(format="%Y-%m-%d", allow_null=True, required=False)
    class Meta(BaseArticleSerializer.Meta):
        model = 译林
        fields = BaseArticleSerializer.Meta.fields + ["原文标题", "原文作者", "原文出版日期", "图片"]


class WenShiSerializer(BaseArticleSerializer):
    class Meta(BaseArticleSerializer.Meta):
        model = 文史
        fields = BaseArticleSerializer.Meta.fields + ["图片", "资源"]


class LunWenSerializer(BaseArticleSerializer):
    class Meta(BaseArticleSerializer.Meta):
        model = 论文
        fields = _fields_no_content + ["图片", "文档"]


class GuJiSerializer(BaseArticleSerializer):
    class Meta(BaseArticleSerializer.Meta):
        model = 古籍
        fields = _fields_no_content + ["图片", "文档"]


class ShuKuSerializer(BaseArticleSerializer):
    class Meta(BaseArticleSerializer.Meta):
        model = 书库
        fields = BaseArticleSerializer.Meta.fields + ["作者简介", "出版日期", "图片", "ISBN", "文档"]


DETAIL_SERIALIZER_MAP = {
    "通讯": TongXunSerializer,
    "书讯": ShuXunSerializer,
    "书评": ShuPingSerializer,
    "观点": GuanDianSerializer,
    "文艺": WenYiSerializer,
    "译林": YiLingSerializer,
    "文史": WenShiSerializer,
    "论文": LunWenSerializer,
    "古籍": GuJiSerializer,
    "书库": ShuKuSerializer,
}


# ========== 列表页序列化器（内容截断，字段更轻量） ==========

def list_cover(data, instance):
    """List cards: a thumbnail of the cover, else of the first content image; None shows the default."""
    if '图片' in data:
        from .images import card_image
        data['图片'] = card_image(instance)
    return data


class BaseListSerializer(serializers.ModelSerializer):
    内容 = serializers.SerializerMethodField()

    def to_representation(self, instance):
        return list_cover(normalize_media_fields(super().to_representation(instance), instance), instance)

    class Meta:
        fields = ["id", "标题", "作者", "内容", "更新时间"]

    def get_内容(self, obj):
        raw = getattr(obj, "内容", "") or ""
        if not raw:
            return ""
        text = strip_tags(str(raw))
        return text[:150] + "..." if len(text) > 150 else text


_list_fields_no_content = [f for f in BaseListSerializer.Meta.fields if f != "内容"]


class TongXunListSerializer(BaseListSerializer):
    class Meta(BaseListSerializer.Meta):
        model = 通讯
        fields = BaseListSerializer.Meta.fields + ["图片"]


class ShuXunListSerializer(BaseListSerializer):
    is_for_sale = serializers.SerializerMethodField()
    作者简介 = serializers.SerializerMethodField()

    class Meta(BaseListSerializer.Meta):
        model = 书讯
        fields = BaseListSerializer.Meta.fields + [
            "图片",
            "出版社",
            "出版年",
            "ISBN",
            "页数",
            "装帧",
            "作者简介",
            "is_for_sale",
        ]

    def get_is_for_sale(self, obj):
        return get_is_for_sale(obj)

    def get_作者简介(self, obj):
        raw = getattr(obj, "作者简介", "") or ""
        if not raw:
            return ""
        text = " ".join(strip_tags(str(raw)).split())
        return text[:120] + "..." if len(text) > 120 else text


class ShuPingListSerializer(BaseListSerializer):
    分类名称 = serializers.CharField(source="分类.名称", default="", read_only=True)

    class Meta(BaseListSerializer.Meta):
        model = 书评
        fields = BaseListSerializer.Meta.fields + ["图片", "分类名称"]


class GuanDianListSerializer(BaseListSerializer):
    class Meta(BaseListSerializer.Meta):
        model = 观点
        fields = BaseListSerializer.Meta.fields + ["图片"]


class WenYiListSerializer(BaseListSerializer):
    class Meta(BaseListSerializer.Meta):
        model = 文艺
        fields = BaseListSerializer.Meta.fields + ["图片"]


class YiLingListSerializer(BaseListSerializer):
    class Meta(BaseListSerializer.Meta):
        model = 译林
        fields = BaseListSerializer.Meta.fields + ["图片"]


class WenShiListSerializer(BaseListSerializer):
    class Meta(BaseListSerializer.Meta):
        model = 文史
        fields = BaseListSerializer.Meta.fields + ["图片"]


class LunWenListSerializer(BaseListSerializer):
    class Meta(BaseListSerializer.Meta):
        model = 论文
        fields = _list_fields_no_content + ["图片", "文档"]


class GuJiListSerializer(BaseListSerializer):
    class Meta(BaseListSerializer.Meta):
        model = 古籍
        fields = _list_fields_no_content + ["图片", "文档"]


class ShuKuListSerializer(BaseListSerializer):
    class Meta(BaseListSerializer.Meta):
        model = 书库
        fields = BaseListSerializer.Meta.fields + ["图片", "文档"]


LIST_SERIALIZER_MAP = {
    "通讯": TongXunListSerializer,
    "书讯": ShuXunListSerializer,
    "书评": ShuPingListSerializer,
    "观点": GuanDianListSerializer,
    "文艺": WenYiListSerializer,
    "译林": YiLingListSerializer,
    "文史": WenShiListSerializer,
    "论文": LunWenListSerializer,
    "古籍": GuJiListSerializer,
    "书库": ShuKuListSerializer,
}
