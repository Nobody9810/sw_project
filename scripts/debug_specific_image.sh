#!/bin/bash

# 调试特定图片文件的 404 问题

set -e

IMAGE_PATH="images/shuxun/799803.jpg"
FULL_PATH="/var/www/sw_project/backend/media/$IMAGE_PATH"
NGINX_CONF="/etc/nginx/sites-available/sw_project.conf"

echo "=========================================="
echo "调试图片 404 问题: $IMAGE_PATH"
echo "=========================================="
echo ""

# 1. 检查文件是否存在
echo "1. 检查文件是否存在..."
if [ -f "$FULL_PATH" ]; then
    echo -e "✓ 文件存在: $FULL_PATH"
    ls -lh "$FULL_PATH" | awk '{print "  大小: " $5 "  权限: " $1 "  所有者: " $3 ":" $4}'
else
    echo -e "✗ 文件不存在: $FULL_PATH"
    echo ""
    echo "  检查目录内容:"
    ls -la /var/www/sw_project/backend/media/images/shuxun/ | head -10
    exit 1
fi
echo ""

# 2. 检查文件权限
echo "2. 检查文件权限..."
if sudo -u www-data test -r "$FULL_PATH" 2>/dev/null; then
    echo -e "✓ www-data 用户可以读取"
else
    echo -e "✗ www-data 用户无法读取"
    echo "  修复权限..."
    sudo chown www-data:www-data "$FULL_PATH"
    sudo chmod 644 "$FULL_PATH"
    echo -e "✓ 权限已修复"
fi
echo ""

# 3. 检查 Nginx 配置
echo "3. 检查 Nginx /media/ location..."
if grep -A 5 "location /media/" "$NGINX_CONF" | grep -q "alias"; then
    ALIAS=$(grep -A 3 "location /media/" "$NGINX_CONF" | grep "alias" | awk '{print $2}' | sed 's/;//')
    echo "  alias: $ALIAS"
    
    # 检查 alias 路径是否正确
    if [[ "$ALIAS" == */ ]]; then
        echo -e "  ✓ alias 末尾有斜杠（正确）"
    else
        echo -e "  ✗ alias 末尾缺少斜杠（错误！）"
    fi
    
    # 检查 alias 路径下的文件
    ALIAS_FILE="$ALIAS$IMAGE_PATH"
    if [ -f "$ALIAS_FILE" ]; then
        echo -e "  ✓ alias 路径下的文件存在: $ALIAS_FILE"
    else
        echo -e "  ✗ alias 路径下的文件不存在: $ALIAS_FILE"
        echo "    这可能是问题所在！"
    fi
else
    echo -e "✗ /media/ location 配置有问题"
fi
echo ""

# 4. 检查 location 顺序
echo "4. 检查 location 顺序..."
MEDIA_LINE=$(grep -n "location /media/" "$NGINX_CONF" | cut -d: -f1)
REGEX_LINE=$(grep -n "location ~\*" "$NGINX_CONF" | cut -d: -f1)

if [ -n "$MEDIA_LINE" ] && [ -n "$REGEX_LINE" ]; then
    if [ "$MEDIA_LINE" -lt "$REGEX_LINE" ]; then
        echo -e "✓ /media/ 在正则 location 之前（正确）"
    else
        echo -e "✗ /media/ 在正则 location 之后（错误！）"
    fi
    echo "  /media/ 在第 $MEDIA_LINE 行"
    echo "  正则 location 在第 $REGEX_LINE 行"
fi
echo ""

# 5. 测试 HTTP 访问
echo "5. 测试 HTTP 访问..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -k "https://www.shuwei365.com/media/$IMAGE_PATH" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "✓ HTTP 状态码: 200 (成功)"
elif [ "$HTTP_CODE" = "404" ]; then
    echo -e "✗ HTTP 状态码: 404 (文件未找到)"
    echo ""
    echo "  可能的原因:"
    echo "    1. Nginx 配置未正确加载"
    echo "    2. alias 路径不正确"
    echo "    3. 文件路径不匹配"
    echo ""
    echo "  检查 Nginx 错误日志:"
    sudo tail -5 /var/log/nginx/sw_project_error.log | grep -i "media\|404" || echo "    无相关错误"
else
    echo -e "✗ HTTP 状态码: $HTTP_CODE"
fi
echo ""

# 6. 验证 Nginx 配置是否已加载
echo "6. 验证配置..."
echo "  检查实际使用的配置文件:"
sudo nginx -T 2>/dev/null | grep -A 5 "location /media/" | head -6 | sed 's/^/    /'
echo ""

echo "=========================================="
echo "诊断完成"
echo "=========================================="
echo ""
echo "如果文件存在但返回 404，请："
echo "1. 确保服务器上的配置文件已更新"
echo "2. 完全重启 Nginx: sudo systemctl restart nginx"
echo "3. 检查 alias 路径末尾是否有斜杠"
echo ""

