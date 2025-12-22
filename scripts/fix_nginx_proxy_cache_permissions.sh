#!/bin/bash

# 修复 Nginx 代理缓存目录权限问题
# 错误：open() "/var/lib/nginx/proxy/1/00/0000000001" failed (13: Permission denied)

set -e

echo "=========================================="
echo "修复 Nginx 代理缓存目录权限"
echo "=========================================="
echo ""

# 修复代理缓存目录权限
echo "1. 修复 /var/lib/nginx 目录权限..."
sudo mkdir -p /var/lib/nginx/proxy
sudo chown -R www-data:www-data /var/lib/nginx/
sudo chmod -R 755 /var/lib/nginx/

echo "✓ 完成"
echo ""

# 验证
echo "2. 验证权限..."
ls -ld /var/lib/nginx/ | awk '{print "  权限: " $1 "  所有者: " $3 ":" $4}'
ls -ld /var/lib/nginx/proxy/ 2>/dev/null | awk '{print "  权限: " $1 "  所有者: " $3 ":" $4}' || echo "  目录已创建"

echo ""
echo "完成！现在重载 Nginx："
echo "  sudo systemctl reload nginx"

