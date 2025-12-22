#!/bin/bash

# 测试媒体文件访问

set -e

MEDIA_PATH="/var/www/sw_project/backend/media/images/shuku"
TEST_FILE="20230117060717958223.jpg"
DOMAIN="www.shuwei365.com"

echo "=========================================="
echo "测试媒体文件访问"
echo "=========================================="
echo ""

# 1. 检查文件是否存在
echo "1. 检查文件是否存在..."
if [ -f "$MEDIA_PATH/$TEST_FILE" ]; then
    echo -e "✓ 文件存在: $MEDIA_PATH/$TEST_FILE"
    ls -lh "$MEDIA_PATH/$TEST_FILE" | awk '{print "  大小: " $5 "  权限: " $1 "  所有者: " $3 ":" $4}'
else
    echo -e "✗ 文件不存在: $MEDIA_PATH/$TEST_FILE"
    exit 1
fi
echo ""

# 2. 检查文件权限
echo "2. 检查文件权限..."
if sudo -u www-data test -r "$MEDIA_PATH/$TEST_FILE" 2>/dev/null; then
    echo -e "✓ www-data 用户可以读取文件"
else
    echo -e "✗ www-data 用户无法读取文件"
    echo "  修复权限..."
    sudo chown -R www-data:www-data "$MEDIA_PATH"
    sudo chmod 644 "$MEDIA_PATH/$TEST_FILE"
    echo -e "✓ 权限已修复"
fi
echo ""

# 3. 检查 Nginx 配置
echo "3. 检查 Nginx /media/ location..."
NGINX_CONF="/etc/nginx/sites-available/sw_project.conf"
if grep -A 3 "location /media/" "$NGINX_CONF" | grep -q "alias"; then
    ALIAS_PATH=$(grep -A 3 "location /media/" "$NGINX_CONF" | grep "alias" | awk '{print $2}' | sed 's/;//')
    echo "  alias 路径: $ALIAS_PATH"
    
    # 检查路径是否正确
    EXPECTED_PATH="/var/www/sw_project/backend/media"
    if [ "$ALIAS_PATH" = "$EXPECTED_PATH" ] || [ "$ALIAS_PATH" = "$EXPECTED_PATH/" ]; then
        echo -e "  ✓ alias 路径正确"
    else
        echo -e "  ✗ alias 路径不匹配"
        echo "    配置: $ALIAS_PATH"
        echo "    期望: $EXPECTED_PATH"
    fi
else
    echo -e "  ✗ /media/ location 配置有问题"
fi
echo ""

# 4. 测试本地文件访问
echo "4. 测试本地文件访问..."
if [ -r "$MEDIA_PATH/$TEST_FILE" ]; then
    FILE_SIZE=$(stat -f%z "$MEDIA_PATH/$TEST_FILE" 2>/dev/null || stat -c%s "$MEDIA_PATH/$TEST_FILE" 2>/dev/null || echo "0")
    echo "  文件大小: $FILE_SIZE 字节"
    if [ "$FILE_SIZE" -gt 0 ]; then
        echo -e "  ✓ 文件不为空"
    else
        echo -e "  ✗ 文件为空"
    fi
fi
echo ""

# 5. 测试 HTTP 访问
echo "5. 测试 HTTP 访问..."
echo "  测试 URL: https://$DOMAIN/media/images/shuku/$TEST_FILE"
echo ""

# 使用 curl 测试
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -k "https://$DOMAIN/media/images/shuku/$TEST_FILE" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "  ✓ HTTP 状态码: 200 (成功)"
    echo ""
    echo "  响应头:"
    curl -I -k "https://$DOMAIN/media/images/shuku/$TEST_FILE" 2>/dev/null | head -5 | sed 's/^/    /'
elif [ "$HTTP_CODE" = "404" ]; then
    echo -e "  ✗ HTTP 状态码: 404 (文件未找到)"
    echo ""
    echo "  可能的原因:"
    echo "    1. Nginx location 配置不正确"
    echo "    2. 文件路径不匹配"
    echo "    3. location 顺序问题（正则 location 在 /media/ 之前）"
elif [ "$HTTP_CODE" = "403" ]; then
    echo -e "  ✗ HTTP 状态码: 403 (权限被拒绝)"
    echo ""
    echo "  可能的原因:"
    echo "    1. 文件权限问题"
    echo "    2. 目录权限问题"
    echo "    3. SELinux 限制"
else
    echo -e "  ✗ HTTP 状态码: $HTTP_CODE (未知错误)"
    echo ""
    echo "  尝试获取详细错误信息:"
    curl -v -k "https://$DOMAIN/media/images/shuku/$TEST_FILE" 2>&1 | grep -i "error\|404\|403" | head -3 | sed 's/^/    /'
fi
echo ""

# 6. 检查 Nginx 错误日志
echo "6. 检查 Nginx 错误日志..."
ERROR_LOG="/var/log/nginx/sw_project_error.log"
if [ -f "$ERROR_LOG" ]; then
    echo "  最近的错误（与 media 相关）:"
    sudo tail -10 "$ERROR_LOG" | grep -i "media\|$TEST_FILE\|404\|403" | tail -3 || echo "    无相关错误"
else
    echo "  错误日志文件不存在"
fi
echo ""

echo "=========================================="
echo "诊断完成"
echo "=========================================="
echo ""
echo "如果 HTTP 状态码不是 200，请检查："
echo "1. location 顺序（/media/ 必须在正则 location 之前）"
echo "2. 文件权限（www-data 用户可读）"
echo "3. Nginx 配置是否正确加载"
echo ""

