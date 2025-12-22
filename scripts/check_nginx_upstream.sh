#!/bin/bash

# 检查 Nginx upstream 配置

set -e

NGINX_CONF="/etc/nginx/sites-available/sw_project.conf"

echo "=========================================="
echo "检查 Nginx upstream 配置"
echo "=========================================="
echo ""

# 1. 检查 upstream 块
echo "1. 检查 upstream 块..."
if grep -q "upstream django" "$NGINX_CONF"; then
    echo -e "✓ 找到 upstream django 块"
    echo ""
    echo "upstream 配置:"
    grep -A 3 "upstream django" "$NGINX_CONF" | sed 's/^/  /'
else
    echo -e "✗ 未找到 upstream django 块"
fi
echo ""

# 2. 检查 upstream 块的位置
echo "2. 检查 upstream 块位置..."
UPSTREAM_LINE=$(grep -n "upstream django" "$NGINX_CONF" | cut -d: -f1)
FIRST_SERVER_LINE=$(grep -n "^server {" "$NGINX_CONF" | head -1 | cut -d: -f1)

if [ -n "$UPSTREAM_LINE" ] && [ -n "$FIRST_SERVER_LINE" ]; then
    if [ "$UPSTREAM_LINE" -lt "$FIRST_SERVER_LINE" ]; then
        echo -e "✓ upstream 块在 server 块之前（正确）"
        echo "  upstream 在第 $UPSTREAM_LINE 行"
        echo "  第一个 server 在第 $FIRST_SERVER_LINE 行"
    else
        echo -e "✗ upstream 块在 server 块之后（错误！）"
        echo "  upstream 应该在任何 server 块之前"
    fi
fi
echo ""

# 3. 检查 server 块中是否使用了 upstream
echo "3. 检查 server 块中的 proxy_pass..."
if grep -q "proxy_pass http://django" "$NGINX_CONF"; then
    echo -e "✓ 找到 proxy_pass http://django"
    echo ""
    echo "使用 upstream 的 location:"
    grep -B 2 "proxy_pass http://django" "$NGINX_CONF" | grep "location" | sed 's/^/  /'
else
    echo -e "✗ 未找到 proxy_pass http://django"
fi
echo ""

# 4. 检查配置文件语法
echo "4. 测试配置文件语法..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo -e "✓ 配置语法正确"
else
    echo -e "✗ 配置语法错误"
    echo ""
    echo "错误详情:"
    sudo nginx -t 2>&1 | grep -v "^$"
fi
echo ""

echo "=========================================="
echo "检查完成"
echo "=========================================="

