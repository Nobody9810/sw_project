#!/bin/bash

# 快速修复 staticfiles 权限问题
# 文件所有者从 django_user 改为 www-data

set -e

STATICFILES_PATH="/var/www/sw_project/backend/staticfiles"

echo "修复 staticfiles 目录权限..."
echo "路径: $STATICFILES_PATH"
echo ""

# 修复所有者
echo "1. 修改文件所有者为 www-data:www-data..."
sudo chown -R www-data:www-data "$STATICFILES_PATH"

# 修复目录权限
echo "2. 设置目录权限为 755..."
sudo find "$STATICFILES_PATH" -type d -exec chmod 755 {} \;

# 修复文件权限
echo "3. 设置文件权限为 644..."
sudo find "$STATICFILES_PATH" -type f -exec chmod 644 {} \;

echo ""
echo "验证权限..."
ls -la "$STATICFILES_PATH/unfold/" | head -5

echo ""
echo "测试文件是否可读（www-data用户）..."
if sudo -u www-data test -r "$STATICFILES_PATH/unfold/css/custom.css" 2>/dev/null; then
    echo "✓ 文件可读"
else
    echo "✗ 文件仍然不可读，请检查 SELinux 或其他安全设置"
fi

echo ""
echo "完成！现在清除浏览器缓存并刷新页面。"

