"""
管理命令：列出数据库中所有可能的评论表
用法: python manage.py list_comment_tables
"""

from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = '列出数据库中所有可能的评论表及其字段'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # 查找所有包含 comment 的表
            cursor.execute("""
                SELECT TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME LIKE '%comment%'
                ORDER BY TABLE_NAME
            """)
            tables = cursor.fetchall()
            
            if not tables:
                self.stdout.write(self.style.WARNING('未找到任何包含 "comment" 的表'))
                return
            
            self.stdout.write(self.style.SUCCESS(f'找到 {len(tables)} 个可能的评论表:\n'))
            
            for table_row in tables:
                table_name = table_row[0]
                self.stdout.write(f'\n表名: {self.style.SUCCESS(table_name)}')
                
                # 获取表的字段
                cursor.execute(f"""
                    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = '{table_name}'
                    ORDER BY ORDINAL_POSITION
                """)
                columns = cursor.fetchall()
                
                self.stdout.write('  字段:')
                for col_name, col_type, is_nullable in columns:
                    nullable = 'NULL' if is_nullable == 'YES' else 'NOT NULL'
                    self.stdout.write(f'    - {col_name} ({col_type}) {nullable}')
                
                # 检查是否是评论主表
                col_names = [col[0] for col in columns]
                has_content_type = 'content_type_id' in col_names
                has_object_pk = 'object_pk' in col_names or 'object_id' in col_names
                has_comment = any(col in col_names for col in ['comment', 'comment_text', 'comment_text_html'])
                
                if has_content_type and has_object_pk and has_comment:
                    self.stdout.write(self.style.SUCCESS('  ✓ 这可能是评论主表（包含必要字段）'))
                else:
                    missing = []
                    if not has_content_type:
                        missing.append('content_type_id')
                    if not has_object_pk:
                        missing.append('object_pk/object_id')
                    if not has_comment:
                        missing.append('comment/comment_text')
                    self.stdout.write(self.style.WARNING(f'  ✗ 缺少必要字段: {", ".join(missing)}'))
                
                # 获取记录数
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                    count = cursor.fetchone()[0]
                    self.stdout.write(f'  记录数: {count}')
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'  无法获取记录数: {str(e)}'))

