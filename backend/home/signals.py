"""
信号处理模块 - 性能优化版本
关键优化:
1. 移除同步PDF缩略图生成,改用异步任务
2. 避免重复的信号处理器
3. 添加错误处理和日志
"""
import os
import re
from urllib.parse import urlparse, unquote
from django.db.models.signals import post_delete, pre_save, post_save
from django.dispatch import receiver
from django.conf import settings
from sorl.thumbnail import delete as delete_thumbnail
from .models import (
    通讯, 书讯, 书评, 观点, 文艺, 译林, 文史, 论文, 古籍, 书库
)
from .compression import compress_image, compress_pdf, should_compress_file

# ==================== 文件删除相关函数 ====================

def delete_file(file_field):
    """删除文件字段对应的物理文件"""
    if not file_field:
        return
    
    file_name = getattr(file_field, 'name', '')
    if not file_name or file_name in ('null', 'None', ''):
        return
    
    try:
        try:
            delete_thumbnail(file_field, delete_file=False)
        except Exception:
            pass
        
        if hasattr(file_field, 'storage') and hasattr(file_field.storage, 'delete'):
            if file_name:
                file_field.storage.delete(file_name)
        
        if hasattr(file_field, 'path'):
            try:
                if os.path.isfile(file_field.path):
                    os.remove(file_field.path)
            except Exception:
                pass
                
    except Exception as e:
        file_path = getattr(file_field, 'path', getattr(file_field, 'name', '未知路径'))
        print(f"删除文件失败: {file_path}, 错误: {e}")


def extract_ckeditor_files(html_content):
    """从CKEditor HTML内容中提取所有文件URL"""
    if not html_content:
        return []
    
    file_urls = []
    
    img_pattern = r'<img[^>]*\s+src=["\']([^"\']+)["\']'
    image_urls = re.findall(img_pattern, html_content, re.IGNORECASE)
    file_urls.extend(image_urls)
    
    link_pattern = r'<a[^>]*\s+href=["\']([^"\']+\.pdf)["\']'
    pdf_urls = re.findall(link_pattern, html_content, re.IGNORECASE)
    file_urls.extend(pdf_urls)
    
    return list(set(file_urls))


def delete_ckeditor_file(file_url):
    """删除CKEditor上传的文件"""
    try:
        parsed = urlparse(file_url)
        path = parsed.path if parsed.netloc else file_url
        path = unquote(path)
        
        if path.startswith('/'):
            path = path[1:]
        if path.startswith('media/'):
            path = path[6:]
        
        file_path = os.path.join(settings.MEDIA_ROOT, path)
        
        if os.path.isfile(file_path):
            try:
                os.remove(file_path)
                file_type = "图片" if path.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp')) else "文件"
                print(f"[删除] 已删除CKEditor{file_type}: {path}")
                return True
            except Exception as e:
                print(f"[删除] 删除CKEditor文件失败: {path}, 错误: {e}")
                return False
        else:
            print(f"[删除] CKEditor文件不存在: {path}")
            return False
            
    except Exception as e:
        print(f"[删除] 处理CKEditor文件URL失败: {file_url}, 错误: {e}")
        return False


def delete_ckeditor_images_from_content(instance):
    """从文章内容中提取并删除所有CKEditor上传的文件"""
    ckeditor_fields = ['内容', '作者简介', '目录', '前言', '内容简介']
    
    deleted_count = 0
    for field_name in ckeditor_fields:
        if hasattr(instance, field_name):
            content = getattr(instance, field_name, None)
            if content:
                file_urls = extract_ckeditor_files(str(content))
                for file_url in file_urls:
                    if delete_ckeditor_file(file_url):
                        deleted_count += 1
    
    if deleted_count > 0:
        print(f"[删除] 共删除 {deleted_count} 个CKEditor文件")

# ==================== post_delete 信号处理器 ====================

@receiver(post_delete, sender=通讯)
def delete_tongxun_files(sender, instance, **kwargs):
    if instance.图片:
        delete_file(instance.图片)
    delete_ckeditor_images_from_content(instance)


@receiver(post_delete, sender=书讯)
def delete_shuxun_files(sender, instance, **kwargs):
    if instance.图片:
        delete_file(instance.图片)
    delete_ckeditor_images_from_content(instance)


@receiver(post_delete, sender=书评)
def delete_shuping_files(sender, instance, **kwargs):
    if instance.图片:
        delete_file(instance.图片)
    delete_ckeditor_images_from_content(instance)


@receiver(post_delete, sender=观点)
def delete_guandian_files(sender, instance, **kwargs):
    if instance.图片:
        delete_file(instance.图片)
    delete_ckeditor_images_from_content(instance)


@receiver(post_delete, sender=文艺)
def delete_wenyi_files(sender, instance, **kwargs):
    if instance.图片:
        delete_file(instance.图片)
    delete_ckeditor_images_from_content(instance)


@receiver(post_delete, sender=译林)
def delete_yiling_files(sender, instance, **kwargs):
    if instance.图片:
        delete_file(instance.图片)
    delete_ckeditor_images_from_content(instance)


@receiver(post_delete, sender=文史)
def delete_wenshi_files(sender, instance, **kwargs):
    if instance.图片:
        delete_file(instance.图片)
    delete_ckeditor_images_from_content(instance)


@receiver(post_delete, sender=论文)
def delete_lunwen_files(sender, instance, **kwargs):
    if instance.图片:
        delete_file(instance.图片)
    if instance.文档:
        delete_file(instance.文档)
    delete_ckeditor_images_from_content(instance)


@receiver(post_delete, sender=古籍)
def delete_guji_files(sender, instance, **kwargs):
    if instance.文档:
        delete_file(instance.文档)
    delete_ckeditor_images_from_content(instance)


@receiver(post_delete, sender=书库)
def delete_shuku_files(sender, instance, **kwargs):
    if instance.文档:
        delete_file(instance.文档)
    delete_ckeditor_images_from_content(instance)


# ==================== pre_save 信号处理器(压缩已禁用) ====================

def compress_file_field(instance, field_name):
    """
    压缩文件字段(已禁用,由 CompressedFileSystemStorage 处理)
    """
    pass


@receiver(pre_save, sender=通讯)
def compress_tongxun_files(sender, instance, **kwargs):
    compress_file_field(instance, '图片')


@receiver(pre_save, sender=书讯)
def compress_shuxun_files(sender, instance, **kwargs):
    compress_file_field(instance, '图片')


@receiver(pre_save, sender=书评)
def compress_shuping_files(sender, instance, **kwargs):
    compress_file_field(instance, '图片')


@receiver(pre_save, sender=观点)
def compress_guandian_files(sender, instance, **kwargs):
    compress_file_field(instance, '图片')


@receiver(pre_save, sender=文艺)
def compress_wenyi_files(sender, instance, **kwargs):
    compress_file_field(instance, '图片')


@receiver(pre_save, sender=译林)
def compress_yiling_files(sender, instance, **kwargs):
    compress_file_field(instance, '图片')


@receiver(pre_save, sender=文史)
def compress_wenshi_files(sender, instance, **kwargs):
    compress_file_field(instance, '图片')


@receiver(pre_save, sender=论文)
def compress_lunwen_files(sender, instance, **kwargs):
    compress_file_field(instance, '图片')
    compress_file_field(instance, '文档')


@receiver(pre_save, sender=古籍)
def compress_guji_files(sender, instance, **kwargs):
    compress_file_field(instance, '文档')


@receiver(pre_save, sender=书库)
def compress_shuku_files(sender, instance, **kwargs):
    compress_file_field(instance, '文档')


# ==================== PDF缩略图生成 - 使用 post_save 异步处理 ====================

@receiver(post_save, sender=论文)
def generate_lunwen_thumbnail(sender, instance, created, **kwargs):
    """
    论文保存后异步生成PDF缩略图
    使用 post_save 避免阻塞请求
    """
    if instance.文档 and not instance.图片:
        try:
            # TODO: 改用 Celery 或 Django-Q 异步任务
            # 暂时使用线程避免阻塞(生产环境应使用消息队列)
            from threading import Thread
            Thread(target=_generate_pdf_thumbnail_task, args=(instance,), daemon=True).start()
        except Exception as e:
            print(f"启动PDF缩略图生成任务失败: {e}")


@receiver(post_save, sender=古籍)
def generate_guji_thumbnail(sender, instance, created, **kwargs):
    """古籍保存后异步生成PDF缩略图"""
    if instance.文档 and not instance.图片:
        try:
            from threading import Thread
            Thread(target=_generate_pdf_thumbnail_task, args=(instance,), daemon=True).start()
        except Exception as e:
            print(f"启动PDF缩略图生成任务失败: {e}")


@receiver(post_save, sender=书库)
def generate_shuku_thumbnail(sender, instance, created, **kwargs):
    """书库保存后异步生成PDF缩略图"""
    if instance.文档 and not instance.图片:
        try:
            from threading import Thread
            Thread(target=_generate_pdf_thumbnail_task, args=(instance,), daemon=True).start()
        except Exception as e:
            print(f"启动PDF缩略图生成任务失败: {e}")


def _generate_pdf_thumbnail_task(instance):
    """
    PDF缩略图生成任务(异步执行)
    
    注意: 这是临时方案,生产环境应使用 Celery
    """
    try:
        from pdf2image import convert_from_path
        from io import BytesIO
        from django.core.files.base import ContentFile
        
        if not instance.文档.name.lower().endswith('.pdf'):
            return
        
        # 获取PDF路径
        if hasattr(instance.文档, 'path'):
            pdf_path = instance.文档.path
        else:
            print(f"无法获取PDF路径: {instance.文档.name}")
            return
        
        if not os.path.exists(pdf_path):
            print(f"PDF文件不存在: {pdf_path}")
            return
        
        # 转换第一页为图片
        images = convert_from_path(pdf_path, first_page=1, last_page=1, dpi=150)
        
        if images:
            image = images[0]
            blob = BytesIO()
            image.save(blob, 'JPEG', quality=85, optimize=True)
            
            # 构建文件名
            pdf_name = os.path.basename(instance.文档.name)
            img_name = os.path.splitext(pdf_name)[0] + '_thumb.jpg'
            
            # 保存缩略图
            instance.图片.save(img_name, ContentFile(blob.getvalue()), save=True)
            print(f"自动生成PDF缩略图成功: {img_name}")
            
    except Exception as e:
        print(f"自动生成PDF缩略图失败 (ID: {instance.id}): {e}")
