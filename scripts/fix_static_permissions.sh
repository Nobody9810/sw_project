#!/bin/bash

# 修复静态文件和媒体文件的权限问题
# 使用方法：在项目根目录运行 ./scripts/fix_static_permissions.sh

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=========================================="
echo "修复静态文件和媒体文件权限"
echo "=========================================="
echo ""

# 检查是否在项目根目录
if [ ! -d "backend" ]; then
    echo -e "${RED}错误：请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 项目路径（根据实际情况修改）
PROJECT_PATH="/var/www/sw_project"
STATICFILES_PATH="$PROJECT_PATH/backend/staticfiles"
MEDIA_PATH="$PROJECT_PATH/backend/media"

echo "项目路径: $PROJECT_PATH"
echo "静态文件路径: $STATICFILES_PATH"
echo "媒体文件路径: $MEDIA_PATH"
echo ""

# 检查路径是否存在
if [ ! -d "$STATICFILES_PATH" ]; then
    echo -e "${YELLOW}⚠${NC} 静态文件目录不存在: $STATICFILES_PATH"
    echo "   请先运行: python manage.py collectstatic"
    echo ""
else
    echo -e "${GREEN}✓${NC} 静态文件目录存在"
fi

if [ ! -d "$MEDIA_PATH" ]; then
    echo -e "${YELLOW}⚠${NC} 媒体文件目录不存在: $MEDIA_PATH"
    echo "   这是正常的，如果还没有上传过文件"
    echo ""
else
    echo -e "${GREEN}✓${NC} 媒体文件目录存在"
fi

# 检查当前权限
echo "=========================================="
echo "当前权限状态"
echo "=========================================="

if [ -d "$STATICFILES_PATH" ]; then
    echo "静态文件目录权限:"
    ls -ld "$STATICFILES_PATH" | awk '{print $1, $3, $4, $9}'
    echo ""
fi

if [ -d "$MEDIA_PATH" ]; then
    echo "媒体文件目录权限:"
    ls -ld "$MEDIA_PATH" | awk '{print $1, $3, $4, $9}'
    echo ""
fi

# 询问是否修复权限
echo "=========================================="
echo "修复权限"
echo "=========================================="
echo ""
echo "将执行以下操作："
echo "1. 将 staticfiles 目录的所有者改为 www-data:www-data"
echo "2. 将 media 目录的所有者改为 www-data:www-data"
echo "3. 设置目录权限为 755（rwxr-xr-x）"
echo "4. 设置文件权限为 644（rw-r--r--）"
echo ""

read -p "是否继续？(y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消"
    exit 0
fi

# 修复静态文件权限
if [ -d "$STATICFILES_PATH" ]; then
    echo ""
    echo "修复静态文件权限..."
    sudo chown -R www-data:www-data "$STATICFILES_PATH"
    sudo find "$STATICFILES_PATH" -type d -exec chmod 755 {} \;
    sudo find "$STATICFILES_PATH" -type f -exec chmod 644 {} \;
    echo -e "${GREEN}✓${NC} 静态文件权限已修复"
else
    echo -e "${YELLOW}⚠${NC} 跳过静态文件（目录不存在）"
fi

# 修复媒体文件权限
if [ -d "$MEDIA_PATH" ]; then
    echo ""
    echo "修复媒体文件权限..."
    sudo chown -R www-data:www-data "$MEDIA_PATH"
    sudo find "$MEDIA_PATH" -type d -exec chmod 755 {} \;
    sudo find "$MEDIA_PATH" -type f -exec chmod 644 {} \;
    echo -e "${GREEN}✓${NC} 媒体文件权限已修复"
else
    echo -e "${YELLOW}⚠${NC} 跳过媒体文件（目录不存在）"
fi

# 验证权限
echo ""
echo "=========================================="
echo "验证权限"
echo "=========================================="

if [ -d "$STATICFILES_PATH" ]; then
    OWNER=$(stat -c '%U:%G' "$STATICFILES_PATH" 2>/dev/null || stat -f '%Su:%Sg' "$STATICFILES_PATH" 2>/dev/null)
    if [ "$OWNER" = "www-data:www-data" ]; then
        echo -e "${GREEN}✓${NC} 静态文件目录所有者正确: $OWNER"
    else
        echo -e "${RED}✗${NC} 静态文件目录所有者不正确: $OWNER"
    fi
fi

if [ -d "$MEDIA_PATH" ]; then
    OWNER=$(stat -c '%U:%G' "$MEDIA_PATH" 2>/dev/null || stat -f '%Su:%Sg' "$MEDIA_PATH" 2>/dev/null)
    if [ "$OWNER" = "www-data:www-data" ]; then
        echo -e "${GREEN}✓${NC} 媒体文件目录所有者正确: $OWNER"
    else
        echo -e "${RED}✗${NC} 媒体文件目录所有者不正确: $OWNER"
    fi
fi

echo ""
echo "=========================================="
echo "完成！"
echo "=========================================="
echo ""
echo "后续步骤："
echo "1. 清除浏览器缓存"
echo "2. 刷新 admin 页面"
echo "3. 检查浏览器开发者工具中的 Network 标签"
echo "   确认 /static/unfold/css/custom.css 返回 200 状态码"
echo ""

