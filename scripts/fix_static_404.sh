#!/bin/bash

# 修复静态文件 404 问题
# 使用方法：在项目根目录运行 ./scripts/fix_static_404.sh

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "修复静态文件 404 问题"
echo "=========================================="
echo ""

# 项目路径
PROJECT_PATH="/var/www/sw_project"
STATICFILES_PATH="$PROJECT_PATH/backend/staticfiles"

# 检查是否在项目根目录
if [ ! -d "backend" ]; then
    echo -e "${RED}错误：请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 检查虚拟环境
if [ -z "$VIRTUAL_ENV" ]; then
    echo -e "${YELLOW}⚠${NC} 未检测到虚拟环境，尝试激活..."
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
        echo -e "${GREEN}✓${NC} 已激活虚拟环境"
    elif [ -f "../venv/bin/activate" ]; then
        source ../venv/bin/activate
        echo -e "${GREEN}✓${NC} 已激活虚拟环境"
    else
        echo -e "${YELLOW}⚠${NC} 未找到虚拟环境，继续执行..."
    fi
fi

# 进入backend目录
cd backend

# 步骤1：收集静态文件
echo "=========================================="
echo "步骤 1: 收集静态文件"
echo "=========================================="
echo "运行: python manage.py collectstatic --noinput"
echo ""

python manage.py collectstatic --noinput

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} 静态文件收集成功"
else
    echo -e "${RED}✗${NC} 静态文件收集失败"
    exit 1
fi
echo ""

# 步骤2：验证文件是否存在
echo "=========================================="
echo "步骤 2: 验证文件"
echo "=========================================="

if [ -f "$STATICFILES_PATH/unfold/css/custom.css" ]; then
    echo -e "${GREEN}✓${NC} unfold/css/custom.css 存在"
else
    echo -e "${RED}✗${NC} unfold/css/custom.css 不存在"
fi

if [ -f "$STATICFILES_PATH/unfold/css/styles.css" ]; then
    echo -e "${GREEN}✓${NC} unfold/css/styles.css 存在"
else
    echo -e "${RED}✗${NC} unfold/css/styles.css 不存在"
fi

if [ -d "$STATICFILES_PATH/unfold" ]; then
    UNFOLD_COUNT=$(find "$STATICFILES_PATH/unfold" -type f | wc -l)
    echo "unfold 目录中的文件数: $UNFOLD_COUNT"
fi
echo ""

# 步骤3：修复权限
echo "=========================================="
echo "步骤 3: 修复文件权限"
echo "=========================================="

if [ -d "$STATICFILES_PATH" ]; then
    echo "修复 staticfiles 目录权限..."
    sudo chown -R www-data:www-data "$STATICFILES_PATH"
    sudo find "$STATICFILES_PATH" -type d -exec chmod 755 {} \;
    sudo find "$STATICFILES_PATH" -type f -exec chmod 644 {} \;
    echo -e "${GREEN}✓${NC} 权限已修复"
else
    echo -e "${RED}✗${NC} staticfiles 目录不存在"
    exit 1
fi
echo ""

# 步骤4：检查Nginx配置
echo "=========================================="
echo "步骤 4: 检查 Nginx 配置"
echo "=========================================="

NGINX_CONF="/etc/nginx/sites-available/sw_project"
if [ -f "$NGINX_CONF" ]; then
    if grep -q "location /static/" "$NGINX_CONF"; then
        echo -e "${GREEN}✓${NC} Nginx 配置中包含 /static/ location"
        
        # 提取并验证 alias 路径
        ALIAS_PATH=$(grep -A 1 "location /static/" "$NGINX_CONF" | grep "alias" | awk '{print $2}' | sed 's/;//' | sed 's/$//')
        if [ -n "$ALIAS_PATH" ]; then
            echo "   alias 路径: $ALIAS_PATH"
            if [ "$ALIAS_PATH" = "$STATICFILES_PATH" ] || [ "$ALIAS_PATH" = "$STATICFILES_PATH/" ]; then
                echo -e "${GREEN}✓${NC} alias 路径正确"
            else
                echo -e "${YELLOW}⚠${NC} alias 路径可能不匹配"
                echo "   配置: $ALIAS_PATH"
                echo "   实际: $STATICFILES_PATH"
            fi
        fi
    else
        echo -e "${RED}✗${NC} Nginx 配置中缺少 /static/ location！"
        echo ""
        echo "需要在 Nginx 配置中添加以下内容："
        echo ""
        echo "    location /static/ {"
        echo "        alias $STATICFILES_PATH/;"
        echo "        expires 1y;"
        echo "        add_header Cache-Control \"public, immutable\";"
        echo "    }"
        echo ""
        echo "添加后运行:"
        echo "    sudo nginx -t"
        echo "    sudo systemctl reload nginx"
    fi
else
    echo -e "${YELLOW}⚠${NC} 未找到 Nginx 配置文件"
fi
echo ""

# 步骤5：测试文件访问
echo "=========================================="
echo "步骤 5: 测试文件访问"
echo "=========================================="

if [ -f "$STATICFILES_PATH/unfold/css/custom.css" ]; then
    if sudo -u www-data test -r "$STATICFILES_PATH/unfold/css/custom.css" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} 文件可读（www-data用户）"
    else
        echo -e "${RED}✗${NC} 文件不可读（www-data用户）"
        echo "   再次尝试修复权限..."
        sudo chown -R www-data:www-data "$STATICFILES_PATH"
        sudo chmod -R 755 "$STATICFILES_PATH"
    fi
fi
echo ""

# 完成
echo "=========================================="
echo "修复完成！"
echo "=========================================="
echo ""
echo "后续步骤："
echo "1. 如果 Nginx 配置已修改，运行："
echo "   sudo nginx -t"
echo "   sudo systemctl reload nginx"
echo ""
echo "2. 清除浏览器缓存并刷新页面"
echo ""
echo "3. 检查浏览器开发者工具中的 Network 标签"
echo "   确认 /static/unfold/css/custom.css 返回 200"
echo ""

cd ..

