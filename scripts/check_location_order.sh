#!/bin/bash

# 检查 location 顺序

NGINX_CONF="/etc/nginx/sites-available/sw_project.conf"

echo "检查 location 顺序..."
echo ""

# 显示所有 location 及其行号
echo "所有 location 块:"
grep -n "^\s*location" "$NGINX_CONF" | while read line; do
    LINE_NUM=$(echo "$line" | cut -d: -f1)
    CONTENT=$(echo "$line" | cut -d: -f2-)
    echo "  第 $LINE_NUM 行: $CONTENT"
done

echo ""
echo "关键检查:"
STATIC_LINE=$(grep -n "location /static/" "$NGINX_CONF" | cut -d: -f1)
MEDIA_LINE=$(grep -n "location /media/" "$NGINX_CONF" | cut -d: -f1)
REGEX_LINE=$(grep -n "location ~\*" "$NGINX_CONF" | cut -d: -f1)

if [ -n "$STATIC_LINE" ] && [ -n "$MEDIA_LINE" ] && [ -n "$REGEX_LINE" ]; then
    if [ "$STATIC_LINE" -lt "$REGEX_LINE" ] && [ "$MEDIA_LINE" -lt "$REGEX_LINE" ]; then
        echo "✓ 顺序正确：/static/ 和 /media/ 在正则之前"
    else
        echo "✗ 顺序错误：正则 location 在 /static/ 或 /media/ 之前"
        echo "  需要调整顺序！"
    fi
fi

