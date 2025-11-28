# Generated migration for migrating old django_comment_Xtd data

from django.db import migrations, connection


def migrate_old_comments(apps, schema_editor):
    """
    从旧的 django_comment_Xtd 表迁移数据到新的 comment_comment 表
    """
    Comment = apps.get_model('comment', 'Comment')
    ContentType = apps.get_model('contenttypes', 'ContentType')
    
    # 检查旧表是否存在
    with connection.cursor() as cursor:
        # 尝试查找所有可能的评论表
        cursor.execute("""
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND (TABLE_NAME LIKE 'django_comment%' OR TABLE_NAME LIKE 'django_comments%')
            AND TABLE_NAME NOT LIKE '%flag%'
            AND TABLE_NAME NOT LIKE '%moderation%'
            AND TABLE_NAME NOT LIKE '%like%'
            ORDER BY TABLE_NAME
        """)
        tables = cursor.fetchall()
        
        if not tables:
            print("未找到旧的评论表，跳过迁移")
            return
        
        print(f"找到可能的评论表: {[t[0] for t in tables]}")
        
        # 查找包含必要字段的表（评论主表）
        old_table_name = None
        for table_row in tables:
            table_name = table_row[0]
            # 检查表是否有必要的字段
            cursor.execute(f"""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = '{table_name}'
            """)
            columns = [row[0] for row in cursor.fetchall()]
            
            # 检查是否有 content_type_id 和 object_pk 或 object_id
            has_content_type = 'content_type_id' in columns
            has_object_pk = 'object_pk' in columns or 'object_id' in columns
            has_comment = any(col in columns for col in ['comment', 'comment_text', 'comment_text_html'])
            
            if has_content_type and has_object_pk and has_comment:
                old_table_name = table_name
                print(f"找到评论主表: {old_table_name}")
                break
        
        # 如果还没找到，尝试更广泛的搜索
        if not old_table_name:
            print("在常见位置未找到评论表，尝试更广泛的搜索...")
            cursor.execute("""
                SELECT TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME LIKE '%comment%'
                AND TABLE_NAME NOT LIKE '%flag%'
                AND TABLE_NAME NOT LIKE '%moderation%'
                AND TABLE_NAME NOT LIKE '%like%'
                ORDER BY TABLE_NAME
            """)
            all_comment_tables = cursor.fetchall()
            
            for table_row in all_comment_tables:
                table_name = table_row[0]
                cursor.execute(f"""
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = '{table_name}'
                """)
                columns = [row[0] for row in cursor.fetchall()]
                
                has_content_type = 'content_type_id' in columns
                has_object_pk = 'object_pk' in columns or 'object_id' in columns
                has_comment = any(col in columns for col in ['comment', 'comment_text', 'comment_text_html'])
                
                if has_content_type and has_object_pk and has_comment:
                    old_table_name = table_name
                    print(f"找到评论主表: {old_table_name}")
                    break
        
        if not old_table_name:
            print("未找到包含必要字段的评论表，跳过迁移")
            print("提示: 请检查数据库中是否有其他名称的评论表")
            print("需要的字段: content_type_id, object_pk/object_id, comment/comment_text")
            return
        
        # 获取旧表的结构
        cursor.execute(f"""
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = '{old_table_name}'
        """)
        columns = {row[0]: row[1] for row in cursor.fetchall()}
        
        print(f"旧表字段: {list(columns.keys())}")
        
        # 构建查询，根据实际字段名调整
        # django-comments-xtd 通常使用的字段名
        field_mapping = {
            'id': 'id',
            'content_type_id': 'content_type_id',
            'object_pk': 'object_pk',  # 可能是字符串，需要转换
            'user_name': 'user_name',
            'user_email': 'user_email',
            'comment': 'comment',  # 也可能是 comment_text
            'submit_date': 'submit_date',
            'site_id': 'site_id',
            'is_public': 'is_public',
            'is_removed': 'is_removed',
            'parent_id': 'parent_id',
            'thread_id': 'thread_id',
            'level': 'level',
            'order': 'order',
        }
        
        # 检查哪些字段存在
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
            print("旧表缺少必要字段，跳过迁移")
            return
        
        # 构建 SELECT 查询
        select_fields = ['id']
        for field in ['content_type_id', 'object_pk', 'user_name', 'user_email', 
                     'comment', 'submit_date', 'site_id', 'is_public', 'is_removed',
                     'parent_id', 'thread_id', 'level', 'order']:
            if field in available_fields:
                select_fields.append(available_fields[field])
        
        query = f"SELECT {', '.join(select_fields)} FROM {old_table_name} ORDER BY id"
        
        print(f"执行查询: {query}")
        cursor.execute(query)
        old_comments = cursor.fetchall()
        
        print(f"找到 {len(old_comments)} 条旧评论")
        
        # 创建 ID 映射（旧ID -> 新ID）
        id_mapping = {}
        
        # 第一遍：创建所有评论（不设置 parent）
        for row in old_comments:
            try:
                old_id = row[0]
                field_idx = 1
                
                # 获取字段值
                content_type_id = row[field_idx] if 'content_type_id' in available_fields else None
                field_idx += 1 if 'content_type_id' in available_fields else 0
                
                object_pk = row[field_idx] if 'object_pk' in available_fields else None
                field_idx += 1 if 'object_pk' in available_fields else 0
                
                # 转换 object_pk 为整数（如果是字符串）
                try:
                    object_id = int(object_pk) if object_pk else None
                except (ValueError, TypeError):
                    print(f"警告: 无法转换 object_pk '{object_pk}' 为整数，跳过评论 ID {old_id}")
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
                
                # 验证 content_type 是否存在
                try:
                    ContentType.objects.get(pk=content_type_id)
                except ContentType.DoesNotExist:
                    print(f"警告: ContentType ID {content_type_id} 不存在，跳过评论 ID {old_id}")
                    continue
                except Exception as e:
                    print(f"警告: 检查 ContentType 时出错 (ID {content_type_id}): {str(e)}，跳过评论 ID {old_id}")
                    continue
                
                # 创建新评论（暂时不设置 parent）
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
                    parent=None,  # 稍后设置
                )
                new_comment.save()
                
                # 保存 ID 映射
                id_mapping[old_id] = {
                    'new_id': new_comment.id,
                    'old_parent_id': old_parent_id,
                    'thread_id': thread_id,
                    'level': level or 0,
                }
                
            except Exception as e:
                print(f"错误: 迁移评论 ID {old_id} 时出错: {str(e)}")
                continue
        
        # 第二遍：设置 parent 关系
        print("设置父评论关系...")
        for old_id, mapping in id_mapping.items():
            if mapping['old_parent_id'] and mapping['old_parent_id'] in id_mapping:
                try:
                    new_comment = Comment.objects.get(pk=mapping['new_id'])
                    parent_new_id = id_mapping[mapping['old_parent_id']]['new_id']
                    new_comment.parent_id = parent_new_id
                    
                    # 如果没有 thread_id，使用父评论的 thread_id 或父评论的 ID
                    if not new_comment.thread_id:
                        parent_comment = Comment.objects.get(pk=parent_new_id)
                        new_comment.thread_id = parent_comment.thread_id or parent_comment.id
                    
                    # 更新 level
                    if new_comment.parent:
                        parent_level = new_comment.parent.level or 0
                        new_comment.level = parent_level + 1
                    
                    new_comment.save()
                except Exception as e:
                    print(f"错误: 设置父评论关系时出错 (旧ID {old_id}): {str(e)}")
        
        # 第三遍：为没有 thread_id 的顶级评论设置 thread_id
        print("设置顶级评论的 thread_id...")
        for old_id, mapping in id_mapping.items():
            if not mapping['old_parent_id']:  # 顶级评论
                try:
                    new_comment = Comment.objects.get(pk=mapping['new_id'])
                    if not new_comment.thread_id:
                        new_comment.thread_id = new_comment.id
                        new_comment.save(update_fields=['thread_id'])
                except Exception as e:
                    print(f"错误: 设置 thread_id 时出错 (旧ID {old_id}): {str(e)}")
        
        print(f"迁移完成！成功迁移 {len(id_mapping)} 条评论")


def reverse_migrate(apps, schema_editor):
    """
    反向迁移(删除迁移的数据)
    注意: 这不会恢复旧表的数据,只是删除新表中的数据
    """
    Comment = apps.get_model('comment', 'Comment')
    # 可以选择删除所有评论或标记迁移的评论
    # 为了安全，这里不执行删除操作
    print("反向迁移: 保留所有评论数据")


class Migration(migrations.Migration):

    dependencies = [
        ('comment', '0001_initial'),
        ('contenttypes', '0002_remove_content_type_name'),
    ]

    operations = [
        migrations.RunPython(migrate_old_comments, reverse_migrate),
    ]

