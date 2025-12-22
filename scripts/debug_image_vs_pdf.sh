#!/bin/bash

# 调试图片和PDF路径差异

echo "=========================================="
echo "调试图片 vs PDF 路径问题"
echo "=========================================="
echo ""

echo "1. 检查 Django MEDIA_URL 配置..."
cd /var/www/sw_project/backend
source ../venv/bin/activate

python manage.py shell << 'EOF'
from django.conf import settings
print("MEDIA_URL:", settings.MEDIA_URL)
print("MEDIA_ROOT:", settings.MEDIA_ROOT)
print("")

# 检查一个实际的图片字段
from home.models import 书库
try:
    book = 书库.objects.filter(图片__isnull=False).first()
    if book:
        print("示例书库记录:")
        print("  ID:", book.id)
        print("  标题:", book.标题)
        print("  图片字段值:", book.图片)
        print("  图片.url:", book.图片.url if book.图片 else "None")
        print("  文档字段值:", book.文档)
        print("  文档.url:", book.文档.url if book.文档 else "None")
        print("")
        print("路径对比:")
        print("  图片路径:", book.图片.url if book.图片 else "None")
        print("  文档路径:", book.文档.url if book.文档 else "None")
    else:
        print("没有找到有图片的书库记录")
except Exception as e:
    print("错误:", e)
EOF

echo ""
echo "2. 检查 Nginx /media/ 配置..."
NGINX_CONF="/etc/nginx/sites-available/sw_project.conf"
if [ -f "$NGINX_CONF" ]; then
    echo "Nginx /media/ location 配置:"
    grep -A 5 "location /media/" "$NGINX_CONF" | sed 's/^/  /'
else
    echo "Nginx 配置文件不存在"
fi

echo ""
echo "3. 测试文件访问..."
MEDIA_PATH="/var/www/sw_project/backend/media"
if [ -d "$MEDIA_PATH" ]; then
    echo "媒体文件目录结构:"
    find "$MEDIA_PATH" -type f -name "*.jpg" -o -name "*.png" -o -name "*.pdf" | head -5 | while read file; do
        echo "  $file"
        ls -l "$file" | awk '{print "    权限: " $1 "  所有者: " $3 ":" $4}'
    done
fi

echo ""
echo "完成！"

