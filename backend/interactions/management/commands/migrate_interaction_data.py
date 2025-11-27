"""
数据迁移命令：将浏览量和点赞数据从 home app 迁移到 interactions app

使用方法：
    python manage.py migrate_interaction_data

这个命令会：
1. 将 home.UserReaction 的数据迁移到 interactions.UserReaction
2. 将各模型的浏览量数据迁移到 interactions.ViewCount
"""
from django.core.management.base import BaseCommand
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from datetime import date
from home.models import (
    通讯, 书讯, 书评, 观点, 文艺, 文史, 译林, 论文, 古籍, 书库
)
from interactions.models import UserReaction, ViewCount


class Command(BaseCommand):
    help = '将浏览量和点赞数据从 home app 迁移到 interactions app'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='只显示将要迁移的数据，不实际执行迁移',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('这是试运行模式，不会实际修改数据'))
        
        with transaction.atomic():
            # 迁移 UserReaction 数据
            self.migrate_user_reactions(dry_run)
            
            # 迁移浏览量数据
            self.migrate_view_counts(dry_run)
        
        if not dry_run:
            self.stdout.write(self.style.SUCCESS('数据迁移完成！'))
        else:
            self.stdout.write(self.style.WARNING('试运行完成，使用 --no-dry-run 执行实际迁移'))

    def migrate_user_reactions(self, dry_run):
        """迁移用户反应数据"""
        self.stdout.write('开始迁移用户反应数据...')
        
        # 直接访问数据库表，因为 home.UserReaction 模型可能已被删除
        from django.db import connection
        from django.db import models as django_models
        
        # 检查 home_userreaction 表是否存在
        table_name = 'home_userreaction'
        table_exists = False
        
        try:
            # 使用 Django 的 introspection API
            db_table_names = connection.introspection.table_names()
            table_exists = table_name in db_table_names
        except:
            # 如果 introspection 失败，尝试直接查询
            try:
                with connection.cursor() as cursor:
                    # 尝试 SQLite
                    cursor.execute("""
                        SELECT name FROM sqlite_master 
                        WHERE type='table' AND name=%s
                    """, [table_name])
                    if cursor.fetchone():
                        table_exists = True
            except:
                try:
                    # 尝试 PostgreSQL/MySQL
                    with connection.cursor() as cursor:
                        if 'postgresql' in connection.vendor:
                            cursor.execute("""
                                SELECT EXISTS (
                                    SELECT FROM information_schema.tables 
                                    WHERE table_name = %s
                                )
                            """, [table_name])
                        elif 'mysql' in connection.vendor:
                            cursor.execute("""
                                SELECT COUNT(*) FROM information_schema.tables 
                                WHERE table_schema = DATABASE() AND table_name = %s
                            """, [table_name])
                        else:
                            cursor.execute("SELECT 1 FROM %s LIMIT 1" % table_name)
                        table_exists = True
                except:
                    table_exists = False
        
        if not table_exists:
            self.stdout.write(self.style.SUCCESS('  home_userreaction 表不存在，跳过迁移'))
            return
        
        # 使用原始 SQL 查询数据
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT user_session, reaction_type, content_type_id, object_id, created_at
                    FROM home_userreaction
                """)
                rows = cursor.fetchall()
                count = len(rows)
                
                if count == 0:
                    self.stdout.write(self.style.SUCCESS('  没有需要迁移的用户反应数据'))
                    return
                
                self.stdout.write(f'  找到 {count} 条用户反应记录')
                
                if not dry_run:
                    migrated = 0
                    for row in rows:
                        user_session, reaction_type, content_type_id, object_id, created_at = row
                        content_type = ContentType.objects.get(id=content_type_id)
                        
                        # 检查是否已存在
                        if not UserReaction.objects.filter(
                            user_session=user_session,
                            content_type=content_type,
                            object_id=object_id
                        ).exists():
                            UserReaction.objects.create(
                                user_session=user_session,
                                reaction_type=reaction_type,
                                content_type=content_type,
                                object_id=object_id,
                                created_at=created_at
                            )
                            migrated += 1
                    
                    self.stdout.write(self.style.SUCCESS(f'  成功迁移 {migrated} 条用户反应记录'))
                else:
                    self.stdout.write(f'  将迁移 {count} 条用户反应记录')
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'  迁移用户反应数据时出错: {str(e)}'))
            self.stdout.write(self.style.SUCCESS('  跳过用户反应数据迁移'))

    def migrate_view_counts(self, dry_run):
        """迁移浏览量数据"""
        self.stdout.write('开始迁移浏览量数据...')
        
        # 定义所有需要迁移的模型
        models_to_migrate = [
            通讯, 书讯, 书评, 观点, 文艺, 文史, 译林, 论文, 古籍, 书库
        ]
        
        total_migrated = 0
        
        for model_class in models_to_migrate:
            model_name = model_class.__name__
            content_type = ContentType.objects.get_for_model(model_class)
            
            # 获取所有有浏览量数据的对象
            items = model_class.objects.filter(
                总浏览量__gt=0
            ) | model_class.objects.filter(
                今日浏览量__gt=0
            )
            
            count = items.count()
            if count == 0:
                continue
            
            self.stdout.write(f'  {model_name}: 找到 {count} 条记录需要迁移')
            
            if not dry_run:
                migrated = 0
                for item in items:
                    view_count, created = ViewCount.objects.get_or_create(
                        content_type=content_type,
                        object_id=item.id,
                        defaults={
                            '总浏览量': getattr(item, '总浏览量', 0),
                            '今日浏览量': getattr(item, '今日浏览量', 0),
                            '最后统计日期': getattr(item, '最后统计日期', None) or date.today()
                        }
                    )
                    
                    if not created:
                        # 如果已存在，更新数据（取较大值）
                        view_count.总浏览量 = max(
                            view_count.总浏览量,
                            getattr(item, '总浏览量', 0)
                        )
                        view_count.今日浏览量 = max(
                            view_count.今日浏览量,
                            getattr(item, '今日浏览量', 0)
                        )
                        if hasattr(item, '最后统计日期') and item.最后统计日期:
                            view_count.最后统计日期 = item.最后统计日期
                        view_count.save()
                    
                    migrated += 1
                
                self.stdout.write(self.style.SUCCESS(f'    {model_name}: 成功迁移 {migrated} 条记录'))
                total_migrated += migrated
            else:
                total_migrated += count
        
        if total_migrated == 0:
            self.stdout.write(self.style.SUCCESS('  没有需要迁移的浏览量数据'))
        elif not dry_run:
            self.stdout.write(self.style.SUCCESS(f'  总共迁移 {total_migrated} 条浏览量记录'))
        else:
            self.stdout.write(f'  将迁移 {total_migrated} 条浏览量记录')
