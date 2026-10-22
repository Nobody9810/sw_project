from rest_framework import serializers
from django.db.models import Count
from .models import Hadith, HadithCollection
from .ordering import chapter_order
from .reading_patterns import SUPPLEMENT_CHAPTER
from .reading_store import chapter_readings



class HadithBibliographySerializer(serializers.Serializer):
    source_version = serializers.CharField(read_only=True, allow_blank=True)
    author = serializers.CharField(read_only=True, allow_blank=True)
    translator = serializers.CharField(read_only=True, allow_blank=True)
    publisher = serializers.CharField(read_only=True, allow_blank=True)
    publication_date = serializers.CharField(read_only=True, allow_blank=True)
    isbn = serializers.CharField(read_only=True, allow_blank=True)


class HadithCollectionSerializer(serializers.ModelSerializer):
    chapters = serializers.SerializerMethodField()
    total_hadiths = serializers.SerializerMethodField()
    bibliography = HadithBibliographySerializer(source='*', read_only=True)
    
    class Meta:
        model = HadithCollection
        fields = ['id', 'name', 'introduction', 'history', 'history_source',
                  'bibliography', 'total_hadiths', 'chapters']
    
    def get_chapters(self, obj):
        """获取该圣训集的所有章节，按正确顺序 + 数字排序"""
        cache = self.context.setdefault('_collection_chapters', {})
        if obj.pk in cache:
            return cache[obj.pk]
        queryset = Hadith.objects.filter(collection=obj)
        chapters = queryset \
            .values('chapter') \
            .annotate(count=Count('id'))

        chapter_counts = {ch['chapter']: ch['count'] for ch in chapters}

        # 转为列表方便排序
        chapter_list = []
        for name, count in chapter_counts.items():
            if not count:
                continue

            sort_key = chapter_order(name)

            chapter_list.append({
                'name': name,
                'count': count,
                'sort_key': sort_key
            })

        # 按数字顺序排序
        chapter_list.sort(key=lambda x: x['sort_key'])

        # 返回前端只需要 name 和 count
        cache[obj.pk] = [{'name': item['name'], 'count': item['count'],
                 'display_name': '补充' if obj.short_name == 'AbuDawud' and item['name'] == SUPPLEMENT_CHAPTER else item['name']}
                for item in chapter_list]
        return cache[obj.pk]

    def get_total_hadiths(self, obj):
        # Same record unit as chapter counts and the paginated reading endpoint;
        # stored historical counters can lag behind admin additions/deletions.
        return sum(chapter['count'] for chapter in self.get_chapters(obj))


class HadithNoteSerializer(serializers.Serializer):
    key = serializers.CharField(read_only=True)
    marker = serializers.CharField(read_only=True, allow_blank=True)
    text = serializers.CharField(read_only=True)
    pdf_page = serializers.IntegerField(read_only=True, allow_null=True)
    status = serializers.ChoiceField(choices=('matched', 'shared', 'unmatched'), read_only=True)


class HadithSerializer(serializers.ModelSerializer):
    collection_name = serializers.CharField(source='collection.name', read_only=True)
    collection_short_name = serializers.CharField(source='collection.short_name', read_only=True)
    body = serializers.CharField(read_only=True, default='')
    notes = HadithNoteSerializer(many=True, read_only=True, default=list)
    
    class Meta:
        model = Hadith
        fields = ['id', 'chapter', 'collection_number', 'text', 'body', 'notes', 'collection', 'collection_name', 'collection_short_name']
        read_only_fields = ['collection']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['data_quality'] = instance.collection.data_quality
        cache = self.context.setdefault('_database_readings', {})
        key = (instance.collection_id, instance.chapter)
        if key not in cache:
            rows = list(Hadith.objects.filter(collection_id=instance.collection_id, chapter=instance.chapter)
                        .order_by('number_order', 'id')
                        .values('id', 'text', 'chapter', 'collection_number', 'reading'))
            cache[key] = chapter_readings(rows, instance.collection_id, instance.chapter, instance.collection.short_name)
        data.update(cache[key][instance.pk])
        return data
