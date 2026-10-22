from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination


class ContentPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_page_size(self, request):
        value = request.query_params.get('page_size', request.query_params.get('limit', self.page_size))
        try:
            size = int(value)
        except (TypeError, ValueError):
            raise ValidationError({'page_size': '必须是正整数'})
        if size < 1 or size > self.max_page_size:
            raise ValidationError({'page_size': f'必须在 1 到 {self.max_page_size} 之间'})
        return size
