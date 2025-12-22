#!/bin/bash

# 检查 CSRF_TRUSTED_ORIGINS 配置
# 使用方法：在项目根目录运行 ./scripts/check_csrf_config.sh

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "检查 CSRF_TRUSTED_ORIGINS 配置"
echo "=========================================="
echo ""

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
else
    echo -e "${GREEN}✓${NC} 虚拟环境已激活: $VIRTUAL_ENV"
fi
echo ""

# 进入backend目录
cd backend

# 1. 检查环境变量
echo "=========================================="
echo "1. 检查环境变量"
echo "=========================================="
if [ -n "$CSRF_TRUSTED_ORIGINS" ]; then
    echo -e "${GREEN}✓${NC} CSRF_TRUSTED_ORIGINS 环境变量已设置:"
    echo "$CSRF_TRUSTED_ORIGINS"
else
    echo -e "${YELLOW}⚠${NC} CSRF_TRUSTED_ORIGINS 环境变量未设置"
fi
echo ""

# 2. 检查 .env 文件
echo "=========================================="
echo "2. 检查 .env 文件"
echo "=========================================="
ENV_FILE="../.env"
if [ -f "$ENV_FILE" ]; then
    echo -e "${GREEN}✓${NC} 找到 .env 文件: $ENV_FILE"
    if grep -q "CSRF_TRUSTED_ORIGINS" "$ENV_FILE"; then
        echo -e "${GREEN}✓${NC} CSRF_TRUSTED_ORIGINS 配置存在:"
        grep "CSRF_TRUSTED_ORIGINS" "$ENV_FILE" | sed 's/^/  /'
    else
        echo -e "${YELLOW}⚠${NC} .env 文件中未找到 CSRF_TRUSTED_ORIGINS 配置"
    fi
else
    echo -e "${YELLOW}⚠${NC} 未找到 .env 文件: $ENV_FILE"
fi
echo ""

# 3. 使用Django shell检查实际配置
echo "=========================================="
echo "3. Django 实际配置（运行时）"
echo "=========================================="
echo "正在检查 Django settings..."
echo ""

CSRF_CONFIG=$(python manage.py shell -c "
from django.conf import settings
import os

print('环境变量 DJANGO_ENV:', os.getenv('DJANGO_ENV', '未设置'))
print('IS_PRODUCTION:', getattr(settings, 'IS_PRODUCTION', '未知'))
print('')
print('CSRF_TRUSTED_ORIGINS:')
csrf_origins = getattr(settings, 'CSRF_TRUSTED_ORIGINS', [])
if csrf_origins:
    for origin in csrf_origins:
        print('  -', origin)
else:
    print('  (空列表)')
print('')
print('CSRF_COOKIE_SECURE:', getattr(settings, 'CSRF_COOKIE_SECURE', '未知'))
print('CSRF_COOKIE_HTTPONLY:', getattr(settings, 'CSRF_COOKIE_HTTPONLY', '未知'))
print('CSRF_COOKIE_SAMESITE:', getattr(settings, 'CSRF_COOKIE_SAMESITE', '未知'))
" 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "$CSRF_CONFIG"
else
    echo -e "${RED}✗${NC} 无法获取Django配置（可能需要先设置环境变量）"
fi
echo ""

# 4. 检查当前域名
echo "=========================================="
echo "4. 当前服务器信息"
echo "=========================================="
if command -v hostname &> /dev/null; then
    HOSTNAME=$(hostname)
    echo "主机名: $HOSTNAME"
fi

if command -v hostname -I &> /dev/null; then
    IP=$(hostname -I | awk '{print $1}')
    echo "IP地址: $IP"
fi

# 尝试从Nginx配置中提取域名
NGINX_CONF="/etc/nginx/sites-available/sw_project"
if [ -f "$NGINX_CONF" ]; then
    echo ""
    echo "从Nginx配置中提取的域名:"
    grep "server_name" "$NGINX_CONF" | grep -v "#" | sed 's/.*server_name//' | sed 's/;//' | sed 's/^/  /'
fi
echo ""

# 5. 提供建议
echo "=========================================="
echo "5. 配置建议"
echo "=========================================="
echo ""
echo "CSRF_TRUSTED_ORIGINS 应该包含："
echo "  - 您的域名（带 https:// 前缀）"
echo "  - 如果有 www 子域名，也要包含"
echo ""
echo "示例配置（.env 文件）："
echo -e "${BLUE}CSRF_TRUSTED_ORIGINS=https://shuwei365.com,https://www.shuwei365.com${NC}"
echo ""
echo "如果使用 HTTP（不推荐生产环境）："
echo -e "${YELLOW}CSRF_TRUSTED_ORIGINS=http://shuwei365.com,http://www.shuwei365.com${NC}"
echo ""

# 6. 检查常见问题
echo "=========================================="
echo "6. 常见问题检查"
echo "=========================================="

# 检查是否缺少协议前缀
if [ -f "$ENV_FILE" ]; then
    CSRF_LINE=$(grep "CSRF_TRUSTED_ORIGINS" "$ENV_FILE" || echo "")
    if [ -n "$CSRF_LINE" ]; then
        if echo "$CSRF_LINE" | grep -qv "https://\|http://"; then
            echo -e "${RED}✗${NC} 警告：CSRF_TRUSTED_ORIGINS 中的域名缺少协议前缀（https:// 或 http://）"
        else
            echo -e "${GREEN}✓${NC} CSRF_TRUSTED_ORIGINS 中的域名包含协议前缀"
        fi
        
        if echo "$CSRF_LINE" | grep -q "http://" && [ -f "$NGINX_CONF" ] && grep -q "ssl_certificate" "$NGINX_CONF"; then
            echo -e "${YELLOW}⚠${NC} 警告：您配置了SSL证书，但CSRF_TRUSTED_ORIGINS中包含http://，建议使用https://"
        fi
    fi
fi

echo ""
echo "=========================================="
echo "检查完成"
echo "=========================================="
echo ""
echo "如果发现问题，请："
echo "1. 编辑 .env 文件，添加或修改 CSRF_TRUSTED_ORIGINS"
echo "2. 重启 Django 应用（Gunicorn/Supervisor）"
echo "3. 重新运行此脚本验证配置"
echo ""

cd ..

