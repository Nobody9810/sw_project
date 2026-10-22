import math
import re
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from rest_framework import serializers
from .options import METHODS


class PrayerQuery(serializers.Serializer):
    city = serializers.CharField(max_length=100, required=False)
    country = serializers.RegexField(r'^[A-Za-z]{2}$', required=False)
    state = serializers.CharField(max_length=100, required=False)
    latitude = serializers.FloatField(min_value=-90, max_value=90, required=False)
    longitude = serializers.FloatField(min_value=-180, max_value=180, required=False)
    timezone = serializers.CharField(max_length=64, required=False)
    date = serializers.DateField(required=False, input_formats=['%Y-%m-%d'])
    method = serializers.ChoiceField(choices=['auto', *METHODS], default='auto')
    school = serializers.ChoiceField(choices=[0, 1], default=0)
    high_latitude = serializers.ChoiceField(choices=[1, 2, 3], default=3)
    tune = serializers.CharField(default='0,0,0,0,0', max_length=40)

    def validate(self, data):
        coordinates = 'latitude' in data or 'longitude' in data
        if coordinates:
            if not all(key in data and math.isfinite(data[key]) for key in ('latitude', 'longitude')):
                raise serializers.ValidationError('请提供有效的经纬度')
            if 'city' in data or 'country' in data or 'state' in data:
                raise serializers.ValidationError('城市与经纬度只能选择一种查询方式')
            # ~1 km precision is enough for this tool; do not cache precise locations.
            data['latitude'] = round(data['latitude'], 2)
            data['longitude'] = round(data['longitude'], 2)
        elif not data.get('city') or not data.get('country'):
            raise serializers.ValidationError('请填写城市和两位国家代码，或使用定位')
        if 'country' in data:
            data['country'] = data['country'].upper()
        if 'timezone' in data:
            try:
                ZoneInfo(data['timezone'])
            except (ZoneInfoNotFoundError, ValueError):
                raise serializers.ValidationError('时区无效，请使用如 Asia/Shanghai 的时区名称')
        parts = data['tune'].split(',')
        if len(parts) != 5 or any(not re.fullmatch(r'-?\d{1,2}', part) or abs(int(part)) > 30 for part in parts):
            raise serializers.ValidationError('校准需按五番顺序填写五个 -30 至 30 的整数')
        data['tune'] = ','.join(str(int(part)) for part in parts)
        return data
