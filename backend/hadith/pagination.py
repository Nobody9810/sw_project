from django.db.models import Q
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.utils.urls import remove_query_param
from shuwei.pagination import ContentPagination


class HadithPagination(ContentPagination):
    """Locate a record within the same filtered, ordered reading list in SQL."""

    def get_page_number(self, request, paginator):
        value = request.query_params.get('target')
        if value is None:
            return super().get_page_number(request, paginator)
        if (not value.isascii() or not value.isdigit() or not 1 <= len(value) <= 19
                or not 0 < int(value) <= 9223372036854775807):
            raise ValidationError({'target': '必须是有效的圣训ID'})
        if not request.query_params.get('collection') or not request.query_params.get('chapter'):
            raise ValidationError({'target': '定位正文需同时指定圣训集和篇章'})
        queryset = paginator.object_list
        ordering = queryset.query.order_by
        fields = [field.lstrip('-') for field in ordering]
        target = queryset.filter(pk=int(value)).values(*fields).first()
        if target is None:
            raise NotFound('该段圣训不在指定篇章中，可能已被移动或删除')
        preceding = Q(pk__in=[])
        equal = {}
        for field in ordering:
            name = field.lstrip('-')
            lookup = 'gt' if field.startswith('-') else 'lt'
            preceding |= Q(**equal, **{f'{name}__{lookup}': target[name]})
            equal[name] = target[name]
        self.target_id = int(value)
        return queryset.filter(preceding).count() // paginator.per_page + 1

    def get_paginated_response(self, data):
        response = super().get_paginated_response(data)
        if hasattr(self, 'target_id'):
            response.data.update(page=self.page.number, target_id=self.target_id)
        return response

    def get_next_link(self):
        link = super().get_next_link()
        return remove_query_param(link, 'target') if link else None

    def get_previous_link(self):
        link = super().get_previous_link()
        return remove_query_param(link, 'target') if link else None
