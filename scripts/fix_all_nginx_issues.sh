#!/bin/bash

# 修复所有 Nginx 相关问题
# 包括：代理缓存权限、静态文件路径、媒体文件权限

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "修复所有 Nginx 相关问题"
echo "=========================================="
echo ""

# 1. 修复 Nginx 代理缓存目录权限
echo "1. 修复 Nginx 代理缓存目录权限..."
sudo mkdir -p /var/lib/nginx/proxy
sudo chown -R www-data:www-data /var/lib/nginx/
sudo chmod -R 755 /var/lib/nginx/
echo -e "${GREEN}✓${NC} 完成"
echo ""

# 2. 检查 dflip 文件位置
echo "2. 检查 dflip 文件..."
FRONTEND_DIST="/var/www/sw_project/frontend/dist"
FRONTEND_PUBLIC="/var/www/sw_project/frontend/public"

if [ -d "$FRONTEND_DIST/static/dflip" ]; then
    echo -e "${GREEN}✓${NC} dflip 文件在 dist 目录中"
    ls -la "$FRONTEND_DIST/static/dflip" | head -5
elif [ -d "$FRONTEND_PUBLIC/static/dflip" ]; then
    echo -e "${YELLOW}⚠${NC} dflip 文件在 public 目录中，需要重新构建前端"
    echo "   运行: cd /var/www/sw_project/frontend && npm run build"
else
    echo -e "${RED}✗${NC} dflip 文件不存在"
fi
echo ""

# 3. 修复媒体文件权限
echo "3. 修复媒体文件权限..."
MEDIA_PATH="/var/www/sw_project/backend/media"
if [ -d "$MEDIA_PATH" ]; then
    sudo chown -R www-data:www-data "$MEDIA_PATH"
    sudo find "$MEDIA_PATH" -type d -exec chmod 755 {} \;
    sudo find "$MEDIA_PATH" -type f -exec chmod 644 {} \;
    echo -e "${GREEN}✓${NC} 媒体文件权限已修复"
else
    echo -e "${YELLOW}⚠${NC} 媒体文件目录不存在（正常，如果还没有上传文件）"
fi
echo ""

# 4. 修复 staticfiles 权限
echo "4. 修复 staticfiles 权限..."
STATICFILES_PATH="/var/www/sw_project/backend/staticfiles"
if [ -d "$STATICFILES_PATH" ]; then
    sudo chown -R www-data:www-data "$STATICFILES_PATH"
    sudo find "$STATICFILES_PATH" -type d -exec chmod 755 {} \;
    sudo find "$STATICFILES_PATH" -type f -exec chmod 644 {} \;
    echo -e "${GREEN}✓${NC} staticfiles 权限已修复"
fi
echo ""

# 5. 检查 Nginx 配置
echo "5. 检查 Nginx 配置..."
NGINX_CONF="/etc/nginx/sites-available/sw_project.conf"
if [ -f "$NGINX_CONF" ]; then
    # 检查前端静态文件配置
    if grep -q "root.*frontend/dist" "$NGINX_CONF"; then
        echo -e "${GREEN}✓${NC} 前端静态文件根目录配置正确"
    else
        echo -e "${YELLOW}⚠${NC} 请检查前端静态文件根目录配置"
    fi
    
    # 检查 /static/ location
    if grep -q "location /static/" "$NGINX_CONF"; then
        echo -e "${GREEN}✓${NC} /static/ location 配置存在"
    else
        echo -e "${RED}✗${NC} /static/ location 配置缺失"
    fi
fi
echo ""

echo "=========================================="
echo "完成！"
echo "=========================================="
echo ""
echo "后续步骤："
echo "1. 如果 dflip 文件缺失，重新构建前端："
echo "   cd /var/www/sw_project/frontend"
echo "   npm run build"
echo ""
echo "2. 重载 Nginx："
echo "   sudo nginx -t"
echo "   sudo systemctl reload nginx"
echo ""

