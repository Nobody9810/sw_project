#!/bin/bash

# 检查 dflip 文件是否正确复制到 dist 目录

set -e

FRONTEND_DIST="/var/www/sw_project/frontend/dist"
FRONTEND_PUBLIC="/var/www/sw_project/frontend/public"

echo "=========================================="
echo "检查 dflip 文件"
echo "=========================================="
echo ""

# 检查源文件
echo "1. 检查源文件（public/static/dflip）..."
if [ -d "$FRONTEND_PUBLIC/static/dflip" ]; then
    echo -e "✓ 源文件目录存在"
    FILE_COUNT=$(find "$FRONTEND_PUBLIC/static/dflip" -type f | wc -l)
    echo "  文件数量: $FILE_COUNT"
else
    echo -e "✗ 源文件目录不存在"
fi
echo ""

# 检查构建后的文件
echo "2. 检查构建后的文件（dist/static/dflip）..."
if [ -d "$FRONTEND_DIST/static/dflip" ]; then
    echo -e "✓ dist 目录中存在 dflip"
    FILE_COUNT=$(find "$FRONTEND_DIST/static/dflip" -type f | wc -l)
    echo "  文件数量: $FILE_COUNT"
    
    # 检查关键文件
    echo ""
    echo "3. 检查关键文件..."
    
    KEY_FILES=(
        "static/dflip/sound/turn2.mp3"
        "static/dflip/js/libs/cmaps/GBK-EUC-H.bcmap"
        "static/dflip/js/dflip.min.js"
        "static/dflip/css/dflip.min.css"
    )
    
    for file in "${KEY_FILES[@]}"; do
        if [ -f "$FRONTEND_DIST/$file" ]; then
            SIZE=$(stat -f%z "$FRONTEND_DIST/$file" 2>/dev/null || stat -c%s "$FRONTEND_DIST/$file" 2>/dev/null || echo "0")
            echo -e "  ✓ $file (大小: $SIZE 字节)"
        else
            echo -e "  ✗ $file (不存在)"
        fi
    done
else
    echo -e "✗ dist 目录中不存在 dflip"
    echo ""
    echo "检查 dist 目录结构..."
    ls -la "$FRONTEND_DIST" | head -10
fi
echo ""

# 检查 dist 根目录
echo "4. 检查 dist 根目录..."
if [ -d "$FRONTEND_DIST" ]; then
    echo "dist 目录内容:"
    ls -la "$FRONTEND_DIST" | grep -E "^d" | awk '{print "  " $9}'
    echo ""
    echo "检查是否有 static 目录:"
    if [ -d "$FRONTEND_DIST/static" ]; then
        echo -e "  ✓ static 目录存在"
        ls -la "$FRONTEND_DIST/static" | head -5
    else
        echo -e "  ✗ static 目录不存在"
        echo ""
        echo "  问题：Vite 可能没有正确复制 public 目录的内容"
        echo "  解决方案：检查 vite.config.ts 中的 publicDir 配置"
    fi
fi
echo ""

# 检查 Nginx 配置
echo "5. 检查 Nginx 配置..."
NGINX_CONF="/etc/nginx/sites-available/sw_project.conf"
if [ -f "$NGINX_CONF" ]; then
    ROOT_PATH=$(grep "root" "$NGINX_CONF" | grep -v "#" | head -1 | awk '{print $2}' | sed 's/;//')
    if [ -n "$ROOT_PATH" ]; then
        echo "  Nginx root 路径: $ROOT_PATH"
        if [ "$ROOT_PATH" = "$FRONTEND_DIST" ] || [ "$ROOT_PATH" = "$FRONTEND_DIST/" ]; then
            echo -e "  ✓ Nginx root 路径正确"
        else
            echo -e "  ⚠ Nginx root 路径可能不正确"
        fi
    fi
fi
echo ""

echo "=========================================="
echo "检查完成"
echo "=========================================="

