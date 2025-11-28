"""
信号处理模块
当从Django后台删除数据时，自动删除关联的图片和文件
当保存数据时，自动压缩上传的图片和PDF文件
"""
import os
import re
from urllib.parse import urlparse, unquote
from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver
from django.conf import settings
from sorl.thumbnail import delete as delete_thumbnail
from .models import (
    通讯, 书讯, 书评, 观点, 文艺, 译林, 文史, 论文, 古籍, 书库
)
from .compression import compress_image, compress_pdf, should_compress_file


def delete_file(file_field):
    """
    删除文件字段对应的物理文件
    支持Django的FileField、ImageField和sorl.thumbnail的ImageField
    确保从media文件夹和数据库中彻底删除
    """
    if not file_field:
        return
    
    # 检查文件名是否有效（排除空字符串、'null'等无效值）
    file_name = getattr(file_field, 'name', '')
    if not file_name or file_name in ('null', 'None', ''):
        return
    
    try:
        # 如果是sorl.thumbnail的ImageField，先删除缩略图
        try:
            delete_thumbnail(file_field, delete_file=False)
        except Exception:
            # 如果不是sorl.thumbnail的ImageField或删除缩略图失败，继续删除原文件
            pass
        
        # 优先使用storage.delete()方法（Django推荐方式，支持本地和远程存储）
        if hasattr(file_field, 'storage') and hasattr(file_field.storage, 'delete'):
            if file_name:
                file_field.storage.delete(file_name)
        
        # 如果storage删除失败或没有storage，尝试使用path属性（本地存储）
        if hasattr(file_field, 'path'):
            try:
                if os.path.isfile(file_field.path):
                    os.remove(file_field.path)
            except Exception:
                # 如果path删除失败，可能文件已经被storage.delete()删除了
                pass
                
    except Exception as e:
        # 如果文件不存在或删除失败，记录错误但不中断删除流程
        file_path = getattr(file_field, 'path', getattr(file_field, 'name', '未知路径'))
        print(f"删除文件失败: {file_path}, 错误: {e}")


def extract_ckeditor_images(html_content):
    """
    从CKEditor HTML内容中提取所有图片URL
    
    参数:
        html_content: CKEditor生成的HTML内容
    
    返回:
        list: 图片URL列表
    """
    if not html_content:
        return []
    
    # 使用正则表达式提取所有img标签的src属性
    # 匹配 <img src="..."> 或 <img src='...'> 格式
    img_pattern = r'<img[^>]*\s+src=["\']([^"\']+)["\']'
    image_urls = re.findall(img_pattern, html_content, re.IGNORECASE)
    
    return image_urls


def extract_ckeditor_files(html_content):
    """
    从CKEditor HTML内容中提取所有文件URL（包括图片和PDF等）
    
    参数:
        html_content: CKEditor生成的HTML内容
    
    返回:
        list: 文件URL列表
    """
    if not html_content:
        return []
    
    file_urls = []
    
    # 提取图片URL
    img_pattern = r'<img[^>]*\s+src=["\']([^"\']+)["\']'
    image_urls = re.findall(img_pattern, html_content, re.IGNORECASE)
    file_urls.extend(image_urls)
    
    # 提取链接中的PDF文件（<a href="...pdf">）
    link_pattern = r'<a[^>]*\s+href=["\']([^"\']+\.pdf)["\']'
    pdf_urls = re.findall(link_pattern, html_content, re.IGNORECASE)
    file_urls.extend(pdf_urls)
    
    # 去重
    return list(set(file_urls))


def delete_ckeditor_file(file_url):
    """
    删除CKEditor上传的文件（图片、PDF等）
    
    参数:
        file_url: 文件的URL（可能是相对路径或绝对路径）
    
    返回:
        bool: 是否成功删除
    """
    try:
        # 解析URL
        parsed = urlparse(file_url)
        
        # 如果是绝对URL，提取路径部分
        if parsed.netloc:
            # 绝对URL，提取路径
            path = parsed.path
        else:
            # 相对URL，直接使用
            path = file_url
        
        # URL解码（处理%20等编码字符）
        path = unquote(path)
        
        # 移除开头的斜杠和media/前缀（如果有）
        if path.startswith('/'):
            path = path[1:]
        if path.startswith('media/'):
            path = path[6:]
        
        # 构建完整文件路径
        file_path = os.path.join(settings.MEDIA_ROOT, path)
        
        # 检查文件是否存在
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
            # 文件不存在，尝试查找类似的文件名（处理编码问题）
            # 如果路径中包含编码字符，尝试不同的解码方式
            alt_paths = [path]
            
            # 如果路径包含编码字符，尝试其他可能的路径
            if '%' in file_url or ' ' in path:
                # 尝试使用原始URL（未解码）
                original_path = file_url
                if original_path.startswith('/'):
                    original_path = original_path[1:]
                if original_path.startswith('media/'):
                    original_path = original_path[6:]
                alt_paths.append(original_path)
                
                # 尝试URL编码的路径
                try:
                    import urllib.parse
                    encoded_path = urllib.parse.quote(path, safe='/')
                    if encoded_path != path:
                        alt_paths.append(encoded_path)
                except:
                    pass
            
            # 尝试所有可能的路径
            for alt_path in alt_paths:
                alt_file_path = os.path.join(settings.MEDIA_ROOT, alt_path)
                if os.path.isfile(alt_file_path):
                    try:
                        os.remove(alt_file_path)
                        file_type = "图片" if alt_path.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp')) else "文件"
                        print(f"[删除] 已删除CKEditor{file_type}（使用备用路径）: {alt_path}")
                        return True
                    except Exception as e:
                        print(f"[删除] 删除CKEditor文件失败（备用路径）: {alt_path}, 错误: {e}")
            
            # 所有路径都找不到文件
            print(f"[删除] CKEditor文件不存在: {path} (已尝试多个路径)")
            return False
            
    except Exception as e:
        print(f"[删除] 处理CKEditor文件URL失败: {file_url}, 错误: {e}")
        return False


def delete_ckeditor_images_from_content(instance):
    """
    从文章内容中提取并删除所有CKEditor上传的文件（图片、PDF等）
    
    参数:
        instance: 文章模型实例
    """
    # 获取所有可能包含CKEditor内容的字段
    ckeditor_fields = ['内容', '作者简介', '目录', '前言', '内容简介']
    
    deleted_count = 0
    for field_name in ckeditor_fields:
        if hasattr(instance, field_name):
            content = getattr(instance, field_name, None)
            if content:
                # 提取所有文件URL（包括图片和PDF）
                file_urls = extract_ckeditor_files(str(content))
                
                # 删除每个文件
                for file_url in file_urls:
                    if delete_ckeditor_file(file_url):
                        deleted_count += 1
    
    if deleted_count > 0:
        print(f"[删除] 共删除 {deleted_count} 个CKEditor文件（图片/PDF）")
    else:
        print(f"[删除] 未找到需要删除的CKEditor文件")


@receiver(post_delete, sender=通讯)
def delete_tongxun_files(sender, instance, **kwargs):
    """删除通讯的图片文件和CKEditor内容中的图片"""
    if instance.图片:
        delete_file(instance.图片)
    # 删除CKEditor内容中的图片
    delete_ckeditor_images_from_content(instance)


@receiver(post_delete, sender=书讯)
def delete_shuxun_files(sender, instance, **kwargs):
    """删除书讯的图片文件和CKEditor内容中的图片"""
    if instance.图片:
        delete_file(instance.图片)
    # 删除CKEditor内容中的图片
    delete_ckeditor_images_from_content(instance)


@receiver(post_delete, sender=书评)
def delete_shuping_files(sender, instance, **kwargs):
    """删除书评的图片文件和CKEditor内容中的图片"""
    if instance.图片:
        delete_file(instance.图片)
    # 删除CKEditor内容中的图片
    delete_ckeditor_images_from_content(instance)


@receiver(post_delete, sender=观点)
def delete_guandian_files(sender, instance, **kwargs):
    """删除观点的图片文件和CKEditor内容中的图片"""
    if instance.图片:
        delete_file(instance.图片)
    # 删除CKEditor内容中的图片
    delete_ckeditor_images_from_content(instance)


@receiver(post_delete, sender=文艺)
def delete_wenyi_files(sender, instance, **kwargs):
    """删除文艺的图片文件和CKEditor内容中的图片"""
    if instance.图片:
        delete_file(instance.图片)
    # 删除CKEditor内容中的图片
    delete_ckeditor_images_from_content(instance)


@receiver(post_delete, sender=译林)
def delete_yiling_files(sender, instance, **kwargs):
    """删除译林的图片文件和CKEditor内容中的图片"""
    if instance.图片:
        delete_file(instance.图片)
    # 删除CKEditor内容中的图片
    delete_ckeditor_images_from_content(instance)


@receiver(post_delete, sender=文史)
def delete_wenshi_files(sender, instance, **kwargs):
    """删除文史的图片文件和CKEditor内容中的图片"""
    if instance.图片:
        delete_file(instance.图片)
    # 删除CKEditor内容中的图片
    delete_ckeditor_images_from_content(instance)


@receiver(post_delete, sender=论文)
def delete_lunwen_files(sender, instance, **kwargs):
    """删除论文的图片、PDF文档文件和CKEditor内容中的图片"""
    # 删除图片
    if instance.图片:
        delete_file(instance.图片)
    # 删除PDF文档（确保从media文件夹中删除）
    if instance.文档:
        delete_file(instance.文档)
    # 删除CKEditor内容中的图片（虽然论文模型内容为None，但保留以防将来使用）
    delete_ckeditor_images_from_content(instance)


@receiver(post_delete, sender=古籍)
def delete_guji_files(sender, instance, **kwargs):
    """删除古籍的PDF文档文件和CKEditor内容中的图片"""
    if instance.文档:
        delete_file(instance.文档)
    # 删除CKEditor内容中的图片（虽然古籍模型内容为None，但保留以防将来使用）
    delete_ckeditor_images_from_content(instance)


@receiver(post_delete, sender=书库)
def delete_shuku_files(sender, instance, **kwargs):
    """删除书库的PDF文档文件和CKEditor内容中的图片"""
    if instance.文档:
        delete_file(instance.文档)
    # 删除CKEditor内容中的图片
    delete_ckeditor_images_from_content(instance)


def compress_file_field(instance, field_name):
    """
    压缩文件字段（备用方案，主要压缩由存储类处理）
    
    参数:
        instance: 模型实例
        field_name: 字段名称
    """
    try:
        field = getattr(instance, field_name, None)
        if not field:
            return
        
        # 检查是否有新上传的文件
        if hasattr(field, 'file') and field.file:
            file = field.file
            # 检查是否是上传的文件对象
            if hasattr(file, 'name') and hasattr(file, 'read'):
                ext = os.path.splitext(file.name)[1].lower()
                image_exts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
                pdf_exts = ['.pdf']
                
                # 重置文件指针
                file.seek(0)
                
                if ext in image_exts and should_compress_file(file, 'image'):
                    compressed = compress_image(file)
                    # 将压缩后的文件保存回字段
                    field.save(file.name, compressed, save=False)
                elif ext in pdf_exts and should_compress_file(file, 'pdf'):
                    compressed = compress_pdf(file)
                    field.save(file.name, compressed, save=False)
    except Exception as e:
        # 如果压缩失败，记录错误但不中断保存流程
        print(f"压缩文件字段 {field_name} 失败: {str(e)}")


# 为所有模型添加pre_save信号处理器来压缩文件
@receiver(pre_save, sender=通讯)
def compress_tongxun_files(sender, instance, **kwargs):
    """压缩通讯的图片文件"""
    compress_file_field(instance, '图片')


@receiver(pre_save, sender=书讯)
def compress_shuxun_files(sender, instance, **kwargs):
    """压缩书讯的图片文件"""
    compress_file_field(instance, '图片')


@receiver(pre_save, sender=书评)
def compress_shuping_files(sender, instance, **kwargs):
    """压缩书评的图片文件"""
    compress_file_field(instance, '图片')


@receiver(pre_save, sender=观点)
def compress_guandian_files(sender, instance, **kwargs):
    """压缩观点的图片文件"""
    compress_file_field(instance, '图片')


@receiver(pre_save, sender=文艺)
def compress_wenyi_files(sender, instance, **kwargs):
    """压缩文艺的图片文件"""
    compress_file_field(instance, '图片')


@receiver(pre_save, sender=译林)
def compress_yiling_files(sender, instance, **kwargs):
    """压缩译林的图片文件"""
    compress_file_field(instance, '图片')


@receiver(pre_save, sender=文史)
def compress_wenshi_files(sender, instance, **kwargs):
    """压缩文史的图片文件"""
    compress_file_field(instance, '图片')


@receiver(pre_save, sender=论文)
def compress_lunwen_files(sender, instance, **kwargs):
    """压缩论文的图片和PDF文档文件"""
    compress_file_field(instance, '图片')
    compress_file_field(instance, '文档')


@receiver(pre_save, sender=古籍)
def compress_guji_files(sender, instance, **kwargs):
    """压缩古籍的PDF文档文件"""
    compress_file_field(instance, '文档')


@receiver(pre_save, sender=书库)
def compress_shuku_files(sender, instance, **kwargs):
    """压缩书库的PDF文档文件"""
    compress_file_field(instance, '文档')

