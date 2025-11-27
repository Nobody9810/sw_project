from rest_framework import serializers
from django.db.models import Count
import re
from .models import Hadith, HadithCollection


class HadithCollectionSerializer(serializers.ModelSerializer):
    chapters = serializers.SerializerMethodField()
    
    class Meta:
        model = HadithCollection
        fields = ['id', 'name', 'short_name', 'arabic_name', 'description', 'total_hadiths', 'is_sahih', 'chapters']
    
    def get_chapters(self, obj):
        """获取该圣训集的所有章节，按正确顺序 + 数字排序"""
        chapters = Hadith.objects.filter(collection=obj) \
            .values('chapter') \
            .annotate(count=Count('id'))

        # 转为列表方便排序
        chapter_list = []
        for ch in chapters:
            name = ch['chapter']
            count = ch['count']

            # 关键：提取章节前的数字作为排序键
            match = re.search(r'第(.+?)篇', name)
            if match:
                num_str = match.group(1)
                # 处理 “第一”、“第二” 这种中文数字
                chinese_nums = {'一':1, '二':2, '三':3, '四':4, '五':5, '六':6, '七':7, '八':8, '九':9, '十':10}
                try:
                    if num_str.isdigit():
                        sort_key = int(num_str)
                    else:
                        # 处理 “第一”、“第九十九” 这种
                        key = 0
                        for k, v in chinese_nums.items():
                            num_str = num_str.replace(k, str(v))
                        # 简单处理 “第九十九” → 99
                        nums = re.findall(r'\d+', num_str)
                        key = int(nums[0]) if nums else 999
                        sort_key = key
                except:
                    sort_key = 999
            elif name.startswith('附'):
                sort_key = 9999  # 附篇放最后
            else:
                sort_key = 0     # 其他放最前

            chapter_list.append({
                'name': name,
                'count': count,
                'sort_key': sort_key
            })

        # 按数字顺序排序
        chapter_list.sort(key=lambda x: x['sort_key'])

        # 返回前端只需要 name 和 count
        return [{'name': item['name'], 'count': item['count']} for item in chapter_list]


class HadithSerializer(serializers.ModelSerializer):
    collection_name = serializers.CharField(source='collection.name', read_only=True)
    collection_short_name = serializers.CharField(source='collection.short_name', read_only=True)
    
    class Meta:
        model = Hadith
        fields = ['id', 'chapter', 'collection_number', 'text', 'collection', 'collection_name', 'collection_short_name']
        read_only_fields = ['collection']

