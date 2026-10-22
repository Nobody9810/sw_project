METHODS = {
    0: '贾法里研究所', 1: '卡拉奇伊斯兰科学大学', 2: '北美伊斯兰协会（ISNA）',
    3: '世界穆斯林联盟（MWL）', 4: '麦加乌姆古拉大学', 5: '埃及测量总局',
    7: '德黑兰大学', 8: '海湾地区', 9: '科威特', 10: '卡塔尔',
    11: '新加坡伊斯兰理事会', 12: '法国伊斯兰组织联盟', 13: '土耳其宗教事务局',
    14: '俄罗斯穆斯林宗教管理机构', 15: 'Moonsighting Committee', 16: '迪拜（实验方法）',
    17: '马来西亚伊斯兰发展局（JAKIM）', 18: '突尼斯', 19: '阿尔及利亚',
    20: '印度尼西亚宗教部', 21: '摩洛哥', 22: '里斯本伊斯兰社区', 23: '约旦',
}
# These are starting parameters, not claims of an official local mosque timetable.
PRESETS = [
    ('beijing', '北京', 39.90, 116.41, 'Asia/Shanghai', 3),
    ('shanghai', '上海', 31.23, 121.47, 'Asia/Shanghai', 3),
    ('yinchuan', '银川', 38.49, 106.23, 'Asia/Shanghai', 3),
    ('urumqi', '乌鲁木齐', 43.83, 87.62, 'Asia/Shanghai', 3),
    ('kuala-lumpur', '吉隆坡', 3.14, 101.69, 'Asia/Kuala_Lumpur', 17),
    ('singapore', '新加坡', 1.35, 103.82, 'Asia/Singapore', 11),
    ('jakarta', '雅加达', -6.21, 106.85, 'Asia/Jakarta', 20),
    ('makkah', '麦加', 21.39, 39.86, 'Asia/Riyadh', 4),
    ('cairo', '开罗', 30.04, 31.24, 'Africa/Cairo', 5),
    ('istanbul', '伊斯坦布尔', 41.01, 28.98, 'Europe/Istanbul', 13),
    ('london', '伦敦', 51.51, -0.13, 'Europe/London', 3),
    ('new-york', '纽约', 40.71, -74.01, 'America/New_York', 2),
    ('sydney', '悉尼', -33.87, 151.21, 'Australia/Sydney', 3),
]
PRAYERS = [('Fajr', '晨礼'), ('Dhuhr', '晌礼'), ('Asr', '晡礼'), ('Maghrib', '昏礼'), ('Isha', '宵礼')]


def public_options():
    return {
        'methods': [{'id': key, 'label': label} for key, label in METHODS.items()],
        'presets': [dict(id=key, label=label, latitude=lat, longitude=lon, timezone=zone, method=method)
                    for key, label, lat, lon, zone, method in PRESETS],
        'schools': [{'id': 0, 'label': '标准（沙斐仪、马立克、罕百里）'}, {'id': 1, 'label': '哈乃斐'}],
        'high_latitudes': [{'id': 3, 'label': '角度比例'}, {'id': 1, 'label': '夜间中点'}, {'id': 2, 'label': '夜间七分之一'}],
    }
