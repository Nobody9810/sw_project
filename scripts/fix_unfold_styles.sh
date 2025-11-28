#!/bin/bash

# 修复生产环境中 unfold admin 样式不工作的问题
# 使用方法：在项目根目录运行 ./scripts/fix_unfold_styles.sh

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=========================================="
echo "修复 Unfold Admin 样式问题"
echo "=========================================="
echo ""

# 检查是否在项目根目录
if [ ! -d "backend" ] || [ ! -d "backend/static" ]; then
    echo -e "${RED}错误：请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 1. 检查自定义CSS文件是否存在
echo "1. 检查自定义CSS文件..."
if [ -f "backend/static/unfold/css/custom.css" ]; then
    echo -e "${GREEN}✓${NC} 自定义CSS文件存在: backend/static/unfold/css/custom.css"
else
    echo -e "${RED}✗${NC} 自定义CSS文件不存在: backend/static/unfold/css/custom.css"
    exit 1
fi
echo ""

# 2. 检查虚拟环境
echo "2. 检查虚拟环境..."
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
else
    echo -e "${GREEN}✓${NC} 虚拟环境已激活: $VIRTUAL_ENV"
fi
echo ""

# 3. 进入backend目录
cd backend

# 4. 检查Django环境
echo "3. 检查Django环境..."
if ! python manage.py --version > /dev/null 2>&1; then
    echo -e "${RED}✗${NC} Django未正确安装或配置"
    exit 1
fi
echo -e "${GREEN}✓${NC} Django环境正常"
echo ""

# 5. 收集静态文件
echo "4. 收集静态文件到 STATIC_ROOT..."
echo "   运行: python manage.py collectstatic --noinput"
python manage.py collectstatic --noinput
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} 静态文件收集成功"
else
    echo -e "${RED}✗${NC} 静态文件收集失败"
    exit 1
fi
echo ""

# 6. 验证unfold静态文件是否被收集
echo "5. 验证unfold静态文件..."
STATIC_ROOT=$(python manage.py shell -c "from django.conf import settings; print(settings.STATIC_ROOT)" 2>/dev/null || echo "staticfiles")

if [ -f "$STATIC_ROOT/unfold/css/custom.css" ]; then
    echo -e "${GREEN}✓${NC} unfold自定义CSS已收集到: $STATIC_ROOT/unfold/css/custom.css"
    
    # 检查文件大小
    FILE_SIZE=$(stat -f%z "$STATIC_ROOT/unfold/css/custom.css" 2>/dev/null || stat -c%s "$STATIC_ROOT/unfold/css/custom.css" 2>/dev/null || echo "0")
    if [ "$FILE_SIZE" -gt 0 ]; then
        echo -e "${GREEN}✓${NC} 文件大小: $FILE_SIZE 字节"
    else
        echo -e "${YELLOW}⚠${NC} 文件大小为0，可能有问题"
    fi
else
    echo -e "${RED}✗${NC} unfold自定义CSS未找到: $STATIC_ROOT/unfold/css/custom.css"
    echo -e "${YELLOW}提示：${NC} 请检查 STATICFILES_DIRS 配置"
    exit 1
fi
echo ""

# 7. 检查文件权限
echo "6. 检查文件权限..."
if [ -r "$STATIC_ROOT/unfold/css/custom.css" ]; then
    echo -e "${GREEN}✓${NC} 文件可读"
else
    echo -e "${RED}✗${NC} 文件不可读，请检查权限"
    echo "   运行: chmod -R 644 $STATIC_ROOT/unfold/css/custom.css"
fi
echo ""

# 8. 检查Nginx配置（如果存在）
echo "7. 检查Nginx配置..."
NGINX_CONF="/etc/nginx/sites-available/sw_project"
if [ -f "$NGINX_CONF" ]; then
    if grep -q "location /static/" "$NGINX_CONF"; then
        STATIC_PATH=$(grep -A 1 "location /static/" "$NGINX_CONF" | grep "alias" | awk '{print $2}' | sed 's/;//')
        if [ -n "$STATIC_PATH" ]; then
            echo -e "${GREEN}✓${NC} Nginx静态文件配置: $STATIC_PATH"
            if [ -d "$STATIC_PATH" ]; then
                if [ -f "$STATIC_PATH/unfold/css/custom.css" ]; then
                    echo -e "${GREEN}✓${NC} Nginx配置的路径中存在unfold CSS"
                else
                    echo -e "${YELLOW}⚠${NC} Nginx配置的路径中不存在unfold CSS"
                    echo "   请确保 Nginx 的 alias 路径指向正确的 staticfiles 目录"
                fi
            else
                echo -e "${YELLOW}⚠${NC} Nginx配置的路径不存在: $STATIC_PATH"
            fi
        fi
    else
        echo -e "${YELLOW}⚠${NC} Nginx配置中未找到 /static/ location"
    fi
else
    echo -e "${YELLOW}⚠${NC} 未找到Nginx配置文件: $NGINX_CONF"
    echo "   如果使用Nginx，请确保配置了 /static/ location"
fi
echo ""

# 9. 提供后续步骤
echo "=========================================="
echo "修复完成！后续步骤："
echo "=========================================="
echo ""
echo "1. 如果使用Nginx，请确保："
echo "   - Nginx配置中的 /static/ location 指向正确的 staticfiles 目录"
echo "   - 运行: sudo nginx -t  # 测试配置"
echo "   - 运行: sudo systemctl reload nginx  # 重载配置"
echo ""
echo "2. 如果使用其他Web服务器，请确保："
echo "   - 静态文件路径配置正确"
echo "   - 文件权限正确（至少644）"
echo ""
echo "3. 清除浏览器缓存并刷新页面"
echo ""
echo "4. 检查浏览器开发者工具："
echo "   - 查看 Network 标签，确认 /static/unfold/css/custom.css 是否成功加载"
echo "   - 查看 Console 标签，确认是否有404错误"
echo ""

cd ..

