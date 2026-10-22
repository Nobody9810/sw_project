from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Hadith, HadithCollection
from .serializers import HadithSerializer, HadithCollectionSerializer
from .quran import quran_proxy
from .daily import daily_reading
from .pagination import HadithPagination


class HadithViewSet(viewsets.ReadOnlyModelViewSet):
    """
    圣训只读视图集
    支持搜索、过滤和排序
    """
    queryset = Hadith.objects.all()
    serializer_class = HadithSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = HadithPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['text', 'reading_search', 'chapter', 'collection_number', 'collection__name']
    ordering_fields = ['collection_number', 'chapter', 'id']
    ordering = ['collection', 'chapter_order', 'number_order', 'id']

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        ordering = list(queryset.query.order_by or self.ordering)
        if not any(field.lstrip('-') in ('id', 'pk') for field in ordering):
            ordering.append('id')
        return queryset.order_by(*ordering)

    def get_queryset(self):
        queryset = super().get_queryset()
        
        collection_id = self.request.query_params.get('collection')
        chapter = self.request.query_params.get('chapter')
        
        if collection_id:
            queryset = queryset.filter(collection_id=collection_id)
        if chapter:
            queryset = queryset.filter(chapter=chapter)
        
        # Numeric ordering is stored in indexed fields and pagination runs in SQL.
        return queryset.select_related('collection')
    
    @action(detail=False, methods=['get'])
    def daily(self, request):
        """
        全站共享的每日圣训，按站点时区在午夜更新。
        """
        hadith, day, expires = daily_reading()
        timing = {'daily_date': day.isoformat(), 'next_update_at': expires.isoformat()}
        data = {**self.get_serializer(hadith).data, **timing} if hadith else {'detail': '暂无圣训数据', **timing}
        response = Response(data, status=200 if hadith else 404)
        response['Cache-Control'] = 'no-store'
        return response


class HadithCollectionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    圣训集只读视图集
    """
    queryset = HadithCollection.objects.all()
    serializer_class = HadithCollectionSerializer
    permission_classes = [permissions.AllowAny]




