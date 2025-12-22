#!/bin/bash

# 快速修复脚本：修复 media 和 staticfiles 的权限和配置问题
# 使用方法：sudo bash scripts/fix_media_static.sh

set -e

echo "=========================================="
echo "修复 Media 和 Staticfiles 配置"
echo "=========================================="
echo ""

# 项目路径（根据实际情况修改）
PROJECT_ROOT="/var/www/sw_project"
BACKEND_DIR="$PROJECT_ROOT/backend"
STATICFILES_DIR="$BACKEND_DIR/staticfiles"
MEDIA_DIR="$BACKEND_DIR/media"
NGINX_USER="www-data"

echo "1. 设置文件权限..."
echo "----------------------------------------"

if [ -d "$STATICFILES_DIR" ]; then
    echo "修复 staticfiles 权限..."
    chown -R $NGINX_USER:$NGINX_USER "$STATICFILES_DIR"
    find "$STATICFILES_DIR" -type d -exec chmod 755 {} \;
    find "$STATICFILES_DIR" -type f -exec chmod 644 {} \;
    echo "✓ staticfiles 权限已修复"
else
    echo "⚠ staticfiles 目录不存在，请先运行: python manage.py collectstatic"
fi

if [ -d "$MEDIA_DIR" ]; then
    echo "修复 media 权限..."
    chown -R $NGINX_USER:$NGINX_USER "$MEDIA_DIR"
    find "$MEDIA_DIR" -type d -exec chmod 755 {} \;
    find "$MEDIA_DIR" -type f -exec chmod 644 {} \;
    echo "✓ media 权限已修复"
else
    echo "⚠ media 目录不存在，正在创建..."
    mkdir -p "$MEDIA_DIR"
    chown -R $NGINX_USER:$NGINX_USER "$MEDIA_DIR"
    chmod 755 "$MEDIA_DIR"
    echo "✓ media 目录已创建"
fi

echo ""
echo "2. 验证 nginx 配置..."
echo "----------------------------------------"

if nginx -t 2>&1 | grep -q "successful"; then
    echo "✓ nginx 配置语法正确"
    echo ""
    echo "3. 重载 nginx..."
    systemctl reload nginx
    echo "✓ nginx 已重载"
else
    echo "✗ nginx 配置有错误，请先修复"
    nginx -t
    exit 1
fi

echo ""
echo "=========================================="
echo "修复完成！"
echo "=========================================="
echo ""
echo "请清除浏览器缓存并刷新页面测试。"

