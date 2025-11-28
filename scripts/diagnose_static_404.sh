#!/bin/bash

# 诊断静态文件 404 问题
# 使用方法：在项目根目录运行 ./scripts/diagnose_static_404.sh

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "诊断静态文件 404 问题"
echo "=========================================="
echo ""

# 项目路径
PROJECT_PATH="/var/www/sw_project"
STATICFILES_PATH="$PROJECT_PATH/backend/staticfiles"
STATIC_SOURCE_PATH="$PROJECT_PATH/backend/static"

# 1. 检查 staticfiles 目录是否存在
echo "=========================================="
echo "1. 检查 staticfiles 目录"
echo "=========================================="
if [ -d "$STATICFILES_PATH" ]; then
    echo -e "${GREEN}✓${NC} staticfiles 目录存在: $STATICFILES_PATH"
    FILE_COUNT=$(find "$STATICFILES_PATH" -type f | wc -l)
    echo "   文件数量: $FILE_COUNT"
else
    echo -e "${RED}✗${NC} staticfiles 目录不存在: $STATICFILES_PATH"
    echo "   需要运行: python manage.py collectstatic"
    exit 1
fi
echo ""

# 2. 检查 unfold 静态文件是否存在
echo "=========================================="
echo "2. 检查 unfold 静态文件"
echo "=========================================="

UNFOLD_FILES=(
    "unfold/css/custom.css"
    "unfold/css/styles.css"
    "unfold/css/simplebar/simplebar.css"
    "unfold/js/app.js"
    "unfold/js/htmx/htmx.js"
    "unfold/js/chart/chart.js"
    "unfold/js/simplebar/simplebar.js"
    "unfold/js/alpine/alpine.js"
    "unfold/fonts/inter/styles.css"
    "unfold/fonts/material-symbols/styles.css"
)

MISSING_FILES=0
for file in "${UNFOLD_FILES[@]}"; do
    if [ -f "$STATICFILES_PATH/$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file (不存在)"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

if [ $MISSING_FILES -gt 0 ]; then
    echo ""
    echo -e "${RED}发现 $MISSING_FILES 个文件缺失${NC}"
    echo "需要运行: python manage.py collectstatic"
fi
echo ""

# 3. 检查源文件是否存在
echo "=========================================="
echo "3. 检查源文件（backend/static）"
echo "=========================================="
if [ -d "$STATIC_SOURCE_PATH" ]; then
    echo -e "${GREEN}✓${NC} 源文件目录存在: $STATIC_SOURCE_PATH"
    if [ -f "$STATIC_SOURCE_PATH/unfold/css/custom.css" ]; then
        echo -e "${GREEN}✓${NC} 自定义CSS源文件存在"
    else
        echo -e "${RED}✗${NC} 自定义CSS源文件不存在"
    fi
else
    echo -e "${YELLOW}⚠${NC} 源文件目录不存在: $STATIC_SOURCE_PATH"
fi
echo ""

# 4. 检查文件权限
echo "=========================================="
echo "4. 检查文件权限"
echo "=========================================="
if [ -d "$STATICFILES_PATH" ]; then
    OWNER=$(stat -c '%U:%G' "$STATICFILES_PATH" 2>/dev/null || stat -f '%Su:%Sg' "$STATICFILES_PATH" 2>/dev/null || echo "未知")
    PERMS=$(stat -c '%a' "$STATICFILES_PATH" 2>/dev/null || stat -f '%A' "$STATICFILES_PATH" 2>/dev/null || echo "未知")
    echo "目录所有者: $OWNER"
    echo "目录权限: $PERMS"
    
    if [ "$OWNER" != "www-data:www-data" ] && [ "$OWNER" != "未知" ]; then
        echo -e "${YELLOW}⚠${NC} 所有者不是 www-data，可能是权限问题"
    fi
    
    # 测试文件是否可读
    if [ -f "$STATICFILES_PATH/unfold/css/custom.css" ]; then
        if sudo -u www-data test -r "$STATICFILES_PATH/unfold/css/custom.css" 2>/dev/null; then
            echo -e "${GREEN}✓${NC} 文件可读（www-data用户）"
        else
            echo -e "${RED}✗${NC} 文件不可读（www-data用户）- 权限问题！"
        fi
    fi
fi
echo ""

# 5. 检查 Nginx 配置
echo "=========================================="
echo "5. 检查 Nginx 配置"
echo "=========================================="
NGINX_CONF="/etc/nginx/sites-available/sw_project"
if [ -f "$NGINX_CONF" ]; then
    if grep -q "location /static/" "$NGINX_CONF"; then
        echo -e "${GREEN}✓${NC} Nginx 配置中包含 /static/ location"
        
        # 提取 alias 路径
        ALIAS_PATH=$(grep -A 1 "location /static/" "$NGINX_CONF" | grep "alias" | awk '{print $2}' | sed 's/;//' | sed 's/$//')
        if [ -n "$ALIAS_PATH" ]; then
            echo "   alias 路径: $ALIAS_PATH"
            
            # 检查路径是否正确
            if [ "$ALIAS_PATH" = "$STATICFILES_PATH" ] || [ "$ALIAS_PATH" = "$STATICFILES_PATH/" ]; then
                echo -e "${GREEN}✓${NC} alias 路径正确"
            else
                echo -e "${RED}✗${NC} alias 路径不匹配！"
                echo "   配置的路径: $ALIAS_PATH"
                echo "   实际路径: $STATICFILES_PATH"
            fi
            
            # 检查路径是否存在
            if [ -d "$ALIAS_PATH" ]; then
                echo -e "${GREEN}✓${NC} alias 路径存在"
            else
                echo -e "${RED}✗${NC} alias 路径不存在: $ALIAS_PATH"
            fi
        fi
    else
        echo -e "${RED}✗${NC} Nginx 配置中缺少 /static/ location！"
        echo "   这是主要问题！需要在 Nginx 配置中添加："
        echo ""
        echo "   location /static/ {"
        echo "       alias $STATICFILES_PATH/;"
        echo "       expires 1y;"
        echo "       add_header Cache-Control \"public, immutable\";"
        echo "   }"
    fi
else
    echo -e "${YELLOW}⚠${NC} 未找到 Nginx 配置文件: $NGINX_CONF"
fi
echo ""

# 6. 检查 Nginx 是否正在运行
echo "=========================================="
echo "6. 检查 Nginx 服务状态"
echo "=========================================="
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓${NC} Nginx 正在运行"
else
    echo -e "${RED}✗${NC} Nginx 未运行"
fi
echo ""

# 7. 测试文件访问
echo "=========================================="
echo "7. 测试文件访问"
echo "=========================================="
if [ -f "$STATICFILES_PATH/unfold/css/custom.css" ]; then
    echo "测试文件: $STATICFILES_PATH/unfold/css/custom.css"
    
    # 检查文件大小
    FILE_SIZE=$(stat -f%z "$STATICFILES_PATH/unfold/css/custom.css" 2>/dev/null || stat -c%s "$STATICFILES_PATH/unfold/css/custom.css" 2>/dev/null || echo "0")
    echo "文件大小: $FILE_SIZE 字节"
    
    if [ "$FILE_SIZE" -gt 0 ]; then
        echo -e "${GREEN}✓${NC} 文件不为空"
    else
        echo -e "${RED}✗${NC} 文件为空"
    fi
fi
echo ""

# 总结和建议
echo "=========================================="
echo "诊断总结"
echo "=========================================="
echo ""
echo "根据检查结果，请执行以下步骤："
echo ""
echo "1. 如果文件缺失，运行收集静态文件："
echo "   cd $PROJECT_PATH/backend"
echo "   source ../venv/bin/activate"
echo "   python manage.py collectstatic --noinput"
echo ""
echo "2. 如果权限问题，修复权限："
echo "   sudo chown -R www-data:www-data $STATICFILES_PATH"
echo "   sudo find $STATICFILES_PATH -type d -exec chmod 755 {} \\;"
echo "   sudo find $STATICFILES_PATH -type f -exec chmod 644 {} \\;"
echo ""
echo "3. 如果 Nginx 配置问题，添加 /static/ location"
echo ""
echo "4. 重载 Nginx："
echo "   sudo nginx -t"
echo "   sudo systemctl reload nginx"
echo ""

