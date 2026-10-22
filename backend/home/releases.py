"""Read-only release history; drafts and future releases are never public."""
from django.utils import timezone
from django.views.decorators.cache import never_cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import serializers

from shuwei.pagination import ContentPagination
from .models import ReleaseNote
from .html import public_html, safe_html


class ReleaseSerializer(serializers.ModelSerializer):
    content = serializers.SerializerMethodField()

    class Meta:
        model = ReleaseNote
        fields = ('id', 'version', 'title', 'summary', 'content', 'published_at')

    def get_content(self, obj):
        return public_html(safe_html(obj.content))


def published():
    return ReleaseNote.objects.filter(is_published=True, published_at__lte=timezone.now())


@never_cache
@api_view(['GET'])
@permission_classes([AllowAny])
def release_list(request):
    pagination = ContentPagination()
    pagination.page_size = 5
    page = pagination.paginate_queryset(published(), request)
    return pagination.get_paginated_response(ReleaseSerializer(page, many=True).data)


@never_cache
@api_view(['GET'])
@permission_classes([AllowAny])
def latest_release(request):
    # Do not resurrect an older reminder when the newest release opts out.
    note = published().first()
    data = None
    if note and note.notify:
        data = ReleaseSerializer(note).data
    return Response({'release': data})
