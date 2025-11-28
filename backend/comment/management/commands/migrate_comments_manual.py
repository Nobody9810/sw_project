"""
管理命令：手动迁移评论数据（可以指定表名）
用法: python manage.py migrate_comments_manual --table django_comments_xtd_comment
"""

from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.contrib.contenttypes.models import ContentType
from comment.models import Comment


class Command(BaseCommand):
    help = '手动迁移指定表的评论数据'

    def add_arguments(self, parser):
        parser.add_argument(
            '--table',
            type=str,
            help='要迁移的表名',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='仅显示将要迁移的数据，不实际执行迁移',
        )

    def handle(self, *args, **options):
        table_name = options.get('table')
        dry_run = options.get('dry_run', False)
        
        if not table_name:
            self.stdout.write(self.style.ERROR('请使用 --table 参数指定要迁移的表名'))
            self.stdout.write('提示: 使用 python manage.py list_comment_tables 查看所有可能的表')
            return
        
        # 检查表是否存在
        with connection.cursor() as cursor:
            cursor.execute(f"""
                SELECT TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = '{table_name}'
            """)
            if not cursor.fetchone():
                self.stdout.write(self.style.ERROR(f'表 "{table_name}" 不存在'))
                return
            
            # 获取表结构
            cursor.execute(f"""
                SELECT COLUMN_NAME, DATA_TYPE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = '{table_name}'
            """)
            columns = {row[0]: row[1] for row in cursor.fetchall()}
            
            self.stdout.write(f'表 "{table_name}" 的字段: {list(columns.keys())}')
            
            # 检查必要字段
            available_fields = {}
            for new_field, possible_names in [
                ('content_type_id', ['content_type_id']),
                ('object_pk', ['object_pk', 'object_id']),
                ('user_name', ['user_name', 'name']),
                ('user_email', ['user_email', 'email']),
                ('comment', ['comment', 'comment_text', 'comment_text_html']),
                ('submit_date', ['submit_date', 'submit_date_time']),
                ('site_id', ['site_id']),
                ('is_public', ['is_public', 'is_approved']),
                ('is_removed', ['is_removed', 'is_deleted']),
                ('parent_id', ['parent_id', 'reply_to_id']),
                ('thread_id', ['thread_id']),
                ('level', ['level', 'tree_id']),
                ('order', ['order', 'lft', 'tree_id']),
            ]:
                for name in possible_names:
                    if name in columns:
                        available_fields[new_field] = name
                        break
            
            if 'content_type_id' not in available_fields or 'object_pk' not in available_fields:
                self.stdout.write(self.style.ERROR('表缺少必要字段 (content_type_id 和 object_pk/object_id)'))
                return
            
            # 获取数据
            select_fields = ['id']
            for field in ['content_type_id', 'object_pk', 'user_name', 'user_email', 
                         'comment', 'submit_date', 'site_id', 'is_public', 'is_removed',
                         'parent_id', 'thread_id', 'level', 'order']:
                if field in available_fields:
                    select_fields.append(available_fields[field])
            
            query = f"SELECT {', '.join(select_fields)} FROM {table_name} ORDER BY id"
            cursor.execute(query)
            old_comments = cursor.fetchall()
            
            self.stdout.write(f'\n找到 {len(old_comments)} 条评论')
            
            if dry_run:
                self.stdout.write(self.style.WARNING('\n[DRY RUN] 仅显示，不实际迁移'))
                for i, row in enumerate(old_comments[:5], 1):  # 只显示前5条
                    self.stdout.write(f'  评论 {i}: ID={row[0]}')
                if len(old_comments) > 5:
                    self.stdout.write(f'  ... 还有 {len(old_comments) - 5} 条评论')
                return
            
            # 执行迁移
            self.stdout.write('\n开始迁移...')
            id_mapping = {}
            migrated_count = 0
            
            with transaction.atomic():
                # 第一遍：创建所有评论
                for row in old_comments:
                    try:
                        old_id = row[0]
                        field_idx = 1
                        
                        content_type_id = row[field_idx] if 'content_type_id' in available_fields else None
                        field_idx += 1 if 'content_type_id' in available_fields else 0
                        
                        object_pk = row[field_idx] if 'object_pk' in available_fields else None
                        field_idx += 1 if 'object_pk' in available_fields else 0
                        
                        try:
                            object_id = int(object_pk) if object_pk else None
                        except (ValueError, TypeError):
                            self.stdout.write(self.style.WARNING(f'跳过评论 ID {old_id}: 无法转换 object_pk'))
                            continue
                        
                        user_name = row[field_idx] if 'user_name' in available_fields else '匿名用户'
                        field_idx += 1 if 'user_name' in available_fields else 0
                        
                        user_email = row[field_idx] if 'user_email' in available_fields else ''
                        field_idx += 1 if 'user_email' in available_fields else 0
                        
                        comment_text = row[field_idx] if 'comment' in available_fields else ''
                        field_idx += 1 if 'comment' in available_fields else 0
                        
                        submit_date = row[field_idx] if 'submit_date' in available_fields else None
                        field_idx += 1 if 'submit_date' in available_fields else 0
                        
                        site_id = row[field_idx] if 'site_id' in available_fields else 1
                        field_idx += 1 if 'site_id' in available_fields else 0
                        
                        is_public = row[field_idx] if 'is_public' in available_fields else False
                        field_idx += 1 if 'is_public' in available_fields else 0
                        
                        is_removed = row[field_idx] if 'is_removed' in available_fields else False
                        field_idx += 1 if 'is_removed' in available_fields else 0
                        
                        old_parent_id = row[field_idx] if 'parent_id' in available_fields else None
                        field_idx += 1 if 'parent_id' in available_fields else 0
                        
                        thread_id = row[field_idx] if 'thread_id' in available_fields else None
                        field_idx += 1 if 'thread_id' in available_fields else 0
                        
                        level = row[field_idx] if 'level' in available_fields else 0
                        field_idx += 1 if 'level' in available_fields else 0
                        
                        order = row[field_idx] if 'order' in available_fields else 0
                        
                        # 验证 content_type
                        try:
                            ContentType.objects.get(pk=content_type_id)
                        except ContentType.DoesNotExist:
                            self.stdout.write(self.style.WARNING(f'跳过评论 ID {old_id}: ContentType 不存在'))
                            continue
                        
                        # 创建新评论
                        new_comment = Comment(
                            content_type_id=content_type_id,
                            object_id=object_id,
                            user_name=user_name or '匿名用户',
                            user_email=user_email or '',
                            comment=comment_text or '',
                            submit_date=submit_date,
                            site_id=site_id or 1,
                            is_public=bool(is_public),
                            is_removed=bool(is_removed),
                            level=level or 0,
                            thread_id=thread_id,
                            order=order or 0,
                            parent=None,
                        )
                        new_comment.save()
                        
                        id_mapping[old_id] = {
                            'new_id': new_comment.id,
                            'old_parent_id': old_parent_id,
                        }
                        migrated_count += 1
                        
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f'迁移评论 ID {old_id} 时出错: {str(e)}'))
                        continue
                
                # 第二遍：设置 parent 关系
                for old_id, mapping in id_mapping.items():
                    if mapping['old_parent_id'] and mapping['old_parent_id'] in id_mapping:
                        try:
                            new_comment = Comment.objects.get(pk=mapping['new_id'])
                            parent_new_id = id_mapping[mapping['old_parent_id']]['new_id']
                            new_comment.parent_id = parent_new_id
                            
                            if not new_comment.thread_id:
                                parent_comment = Comment.objects.get(pk=parent_new_id)
                                new_comment.thread_id = parent_comment.thread_id or parent_comment.id
                            
                            if new_comment.parent:
                                parent_level = new_comment.parent.level or 0
                                new_comment.level = parent_level + 1
                            
                            new_comment.save()
                        except Exception as e:
                            self.stdout.write(self.style.ERROR(f'设置父评论关系时出错: {str(e)}'))
                
                # 第三遍：设置顶级评论的 thread_id
                for old_id, mapping in id_mapping.items():
                    if not mapping['old_parent_id']:
                        try:
                            new_comment = Comment.objects.get(pk=mapping['new_id'])
                            if not new_comment.thread_id:
                                new_comment.thread_id = new_comment.id
                                new_comment.save(update_fields=['thread_id'])
                        except Exception as e:
                            self.stdout.write(self.style.ERROR(f'设置 thread_id 时出错: {str(e)}'))
            
            self.stdout.write(self.style.SUCCESS(f'\n迁移完成！成功迁移 {migrated_count} 条评论'))

