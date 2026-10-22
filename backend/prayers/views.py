import hashlib
from shuwei.submissions import client_address
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from .options import public_options
from .serializers import PrayerQuery
from .service import PrayerError, timetable


class PrayerThrottle(SimpleRateThrottle):
    scope = 'prayer_times'
    rate = '30/min'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': hashlib.sha256(client_address(request).encode()).hexdigest()}


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def options(request):
    return Response(public_options(), headers={'Cache-Control': 'public, max-age=86400'})


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([PrayerThrottle])
def times(request):
    serializer = PrayerQuery(data=request.query_params)
    if not serializer.is_valid():
        return Response({'code': 'invalid_query', 'error': '请检查城市、经纬度或计算设置', 'fields': serializer.errors},
                        status=400, headers={'Cache-Control': 'private, no-store'})
    try:
        result = timetable(serializer.validated_data)
    except PrayerError as exc:
        return Response({'code': exc.code, 'error': exc.message}, status=exc.status,
                        headers={'Cache-Control': 'private, no-store'})
    return Response(result, headers={'Cache-Control': 'private, no-store'})
