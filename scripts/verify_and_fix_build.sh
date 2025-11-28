#!/bin/bash

# 验证构建结果并修复所有问题

set -e

FRONTEND_DIST="/var/www/sw_project/frontend/dist"
FRONTEND_PUBLIC="/var/www/sw_project/frontend/public"

echo "=========================================="
echo "验证构建结果并修复问题"
echo "=========================================="
echo ""

# 1. 检查关键文件
echo "1. 检查 dflip 关键文件..."
KEY_FILES=(
    "static/dflip/sound/turn2.mp3"
    "static/dflip/js/libs/cmaps/GBK-EUC-H.bcmap"
    "static/dflip/js/dflip.min.js"
    "static/dflip/css/dflip.min.css"
)

MISSING_FILES=0
for file in "${KEY_FILES[@]}"; do
    if [ -f "$FRONTEND_DIST/$file" ]; then
        SIZE=$(stat -f%z "$FRONTEND_DIST/$file" 2>/dev/null || stat -c%s "$FRONTEND_DIST/$file" 2>/dev/null || echo "0")
        echo -e "  ✓ $file (大小: $SIZE 字节)"
    else
        echo -e "  ✗ $file (不存在)"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done
echo ""

# 2. 如果文件缺失，检查原因
if [ $MISSING_FILES -gt 0 ]; then
    echo "2. 发现缺失文件，检查原因..."
    
    # 检查源文件是否存在
    if [ -f "$FRONTEND_PUBLIC/static/dflip/sound/turn2.mp3" ]; then
        echo -e "  ✓ 源文件存在"
        echo "  问题：Vite 可能没有正确复制 public 目录"
        echo ""
        echo "  解决方案："
        echo "  1. 检查 vite.config.ts 是否有 publicDir 配置"
        echo "  2. 手动复制文件（临时方案）："
        echo "     cp -r $FRONTEND_PUBLIC/static $FRONTEND_DIST/"
    else
        echo -e "  ✗ 源文件也不存在"
    fi
    echo ""
fi

# 3. 修复权限
echo "3. 修复文件权限..."
if [ -d "$FRONTEND_DIST" ]; then
    sudo chown -R www-data:www-data "$FRONTEND_DIST"
    sudo find "$FRONTEND_DIST" -type d -exec chmod 755 {} \;
    sudo find "$FRONTEND_DIST" -type f -exec chmod 644 {} \;
    echo -e "  ✓ 权限已修复"
else
    echo -e "  ✗ dist 目录不存在"
fi
echo ""

# 4. 如果文件缺失，手动复制（临时方案）
if [ $MISSING_FILES -gt 0 ] && [ -d "$FRONTEND_PUBLIC/static" ]; then
    echo "4. 手动复制缺失的文件..."
    if [ ! -d "$FRONTEND_DIST/static" ]; then
        mkdir -p "$FRONTEND_DIST/static"
    fi
    cp -r "$FRONTEND_PUBLIC/static/dflip" "$FRONTEND_DIST/static/" 2>/dev/null && echo -e "  ✓ 已复制 dflip 文件" || echo -e "  ✗ 复制失败"
    echo ""
fi

# 5. 验证最终结果
echo "5. 最终验证..."
FINAL_MISSING=0
for file in "${KEY_FILES[@]}"; do
    if [ ! -f "$FRONTEND_DIST/$file" ]; then
        FINAL_MISSING=$((FINAL_MISSING + 1))
    fi
done

if [ $FINAL_MISSING -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} 所有关键文件都存在"
else
    echo -e "  ${RED}✗${NC} 仍有 $FINAL_MISSING 个文件缺失"
fi
echo ""

echo "=========================================="
echo "完成"
echo "=========================================="
echo ""
echo "后续步骤："
echo "1. 重载 Nginx: sudo systemctl reload nginx"
echo "2. 清除浏览器缓存并测试"
echo ""

