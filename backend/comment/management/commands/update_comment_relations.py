"""
管理命令：从 django_comments_xtd_xtdcomment 表更新已迁移评论的关系信息
用法: python manage.py update_comment_relations
"""

from django.core.management.base import BaseCommand
from django.db import connection, transaction
from comment.models import Comment


class Command(BaseCommand):
    help = '从 django_comments_xtd_xtdcomment 表更新已迁移评论的 thread_id, parent_id, level, order 等字段'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='仅显示将要更新的数据，不实际执行更新',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        
        with connection.cursor() as cursor:
            # 检查表是否存在
            cursor.execute("""
                SELECT TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'django_comments_xtd_xtdcomment'
            """)
            if not cursor.fetchone():
                self.stdout.write(self.style.WARNING('表 django_comments_xtd_xtdcomment 不存在，跳过更新'))
                return
            
            # 获取扩展表的数据
            cursor.execute("""
                SELECT comment_ptr_id, thread_id, parent_id, level, order
                FROM django_comments_xtd_xtdcomment
                ORDER BY comment_ptr_id
            """)
            xtd_comments = cursor.fetchall()
            
            if not xtd_comments:
                self.stdout.write(self.style.WARNING('django_comments_xtd_xtdcomment 表中没有数据'))
                return
            
            self.stdout.write(f'找到 {len(xtd_comments)} 条扩展评论数据')
            
            if dry_run:
                self.stdout.write(self.style.WARNING('\n[DRY RUN] 仅显示，不实际更新'))
                for i, row in enumerate(xtd_comments[:5], 1):
                    old_id, thread_id, parent_id, level, order = row
                    self.stdout.write(f'  评论 {i}: 旧ID={old_id}, thread_id={thread_id}, parent_id={parent_id}, level={level}, order={order}')
                if len(xtd_comments) > 5:
                    self.stdout.write(f'  ... 还有 {len(xtd_comments) - 5} 条评论')
                return
            
            # 需要建立旧ID到新ID的映射
            # 由于我们已经迁移了数据，需要找到对应的新评论
            # 方法：通过 content_type_id, object_id, user_name, submit_date 来匹配
            
            self.stdout.write('\n开始更新评论关系...')
            updated_count = 0
            not_found_count = 0
            
            with transaction.atomic():
                for row in xtd_comments:
                    old_comment_id, thread_id, parent_id, level, order = row
                    
                    try:
                        # 从 django_comments 表获取原始评论信息
                        cursor.execute("""
                            SELECT content_type_id, object_pk, user_name, submit_date
                            FROM django_comments
                            WHERE id = %s
                        """, [old_comment_id])
                        old_comment_data = cursor.fetchone()
                        
                        if not old_comment_data:
                            self.stdout.write(self.style.WARNING(f'未找到旧评论 ID {old_comment_id} 的原始数据'))
                            not_found_count += 1
                            continue
                        
                        content_type_id, object_pk, user_name, submit_date = old_comment_data
                        
                        # 转换 object_pk 为整数
                        try:
                            object_id = int(object_pk)
                        except (ValueError, TypeError):
                            self.stdout.write(self.style.WARNING(f'无法转换 object_pk: {object_pk}'))
                            not_found_count += 1
                            continue
                        
                        # 在新表中查找对应的评论
                        # 使用多个字段来确保匹配正确
                        new_comment = Comment.objects.filter(
                            content_type_id=content_type_id,
                            object_id=object_id,
                            user_name=user_name,
                            submit_date=submit_date
                        ).first()
                        
                        if not new_comment:
                            self.stdout.write(self.style.WARNING(f'未找到对应的新评论 (旧ID: {old_comment_id})'))
                            not_found_count += 1
                            continue
                        
                        # 更新字段
                        updated = False
                        if thread_id and thread_id != new_comment.thread_id:
                            # 如果 thread_id 指向旧ID，需要转换为新ID
                            # 先尝试直接使用（可能是旧ID）
                            old_thread_comment = Comment.objects.filter(
                                content_type_id=content_type_id,
                                object_id=object_id,
                                submit_date=submit_date
                            ).filter(
                                # 通过其他方式匹配 thread_id 对应的评论
                            ).first()
                            
                            # 如果 thread_id 等于 comment_ptr_id，说明是顶级评论
                            if thread_id == old_comment_id:
                                new_comment.thread_id = new_comment.id
                            else:
                                # 查找 thread_id 对应的新评论
                                cursor.execute("""
                                    SELECT content_type_id, object_pk, user_name, submit_date
                                    FROM django_comments
                                    WHERE id = %s
                                """, [thread_id])
                                thread_data = cursor.fetchone()
                                if thread_data:
                                    t_content_type_id, t_object_pk, t_user_name, t_submit_date = thread_data
                                    try:
                                        t_object_id = int(t_object_pk)
                                        thread_comment = Comment.objects.filter(
                                            content_type_id=t_content_type_id,
                                            object_id=t_object_id,
                                            user_name=t_user_name,
                                            submit_date=t_submit_date
                                        ).first()
                                        if thread_comment:
                                            new_comment.thread_id = thread_comment.id
                                        else:
                                            new_comment.thread_id = new_comment.id  # 默认使用自己
                                    except (ValueError, TypeError):
                                        new_comment.thread_id = new_comment.id
                                else:
                                    new_comment.thread_id = new_comment.id
                            updated = True
                        
                        if parent_id and parent_id != 0:
                            # 查找父评论的新ID
                            cursor.execute("""
                                SELECT content_type_id, object_pk, user_name, submit_date
                                FROM django_comments
                                WHERE id = %s
                            """, [parent_id])
                            parent_data = cursor.fetchone()
                            if parent_data:
                                p_content_type_id, p_object_pk, p_user_name, p_submit_date = parent_data
                                try:
                                    p_object_id = int(p_object_pk)
                                    parent_comment = Comment.objects.filter(
                                        content_type_id=p_content_type_id,
                                        object_id=p_object_id,
                                        user_name=p_user_name,
                                        submit_date=p_submit_date
                                    ).first()
                                    if parent_comment:
                                        new_comment.parent_id = parent_comment.id
                                        # 如果还没有 thread_id，使用父评论的
                                        if not new_comment.thread_id:
                                            new_comment.thread_id = parent_comment.thread_id or parent_comment.id
                                        updated = True
                                except (ValueError, TypeError):
                                    pass
                        
                        if level is not None and level != new_comment.level:
                            new_comment.level = level
                            updated = True
                        
                        if order is not None and order != new_comment.order:
                            new_comment.order = order
                            updated = True
                        
                        if updated:
                            new_comment.save()
                            updated_count += 1
                        
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f'更新评论关系时出错 (旧ID {old_comment_id}): {str(e)}'))
                        continue
            
            self.stdout.write(self.style.SUCCESS(f'\n更新完成！'))
            self.stdout.write(f'  成功更新: {updated_count} 条评论')
            if not_found_count > 0:
                self.stdout.write(self.style.WARNING(f'  未找到对应评论: {not_found_count} 条'))

