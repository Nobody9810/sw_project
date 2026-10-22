from django.core.management.base import BaseCommand, CommandError
from prayers.options import PRESETS
from prayers.serializers import PrayerQuery
from prayers.service import PrayerError, timetable


class Command(BaseCommand):
    help = '只读检查 AlAdhan 连通及礼拜时间结构；不写数据库，不代表当地时间表人工核对'

    def add_arguments(self, parser):
        parser.add_argument('--city', action='append', choices=[item[0] for item in PRESETS],
                            help='可重复；默认检查北京、吉隆坡、伦敦、纽约和悉尼')

    def handle(self, *args, **options):
        selected = options['city'] or ['beijing', 'kuala-lumpur', 'london', 'new-york', 'sydney']
        problems = []
        for key in selected:
            _, label, lat, lon, zone, method = next(item for item in PRESETS if item[0] == key)
            serializer = PrayerQuery(data=dict(latitude=lat, longitude=lon, timezone=zone, method=method))
            serializer.is_valid(raise_exception=True)
            try:
                result = timetable(serializer.validated_data)
                present = sum(item['time'] is not None for item in result['prayers'])
                self.stdout.write(f"{label}：{result['date']}；{zone}；五番 {present}/5；次日晨礼可用={bool(result['next_day_fajr'])}")
                for item in result['prayers']:
                    self.stdout.write(f"  {item['label']}：{item['time'] or '不可计算'}")
                if present != 5 or result['next_day_fajr'] is None:
                    problems.append(label)
            except PrayerError as exc:
                self.stderr.write(f'{label}：[{exc.code}] {exc.message}')
                problems.append(label)
        if problems:
            raise CommandError('以下城市未完整通过：' + '、'.join(problems))
        self.stdout.write(self.style.SUCCESS('接口结构检查通过；未写数据库，请另与当地可靠时间表核对。'))
