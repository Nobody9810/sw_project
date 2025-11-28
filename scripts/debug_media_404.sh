#!/bin/bash

# 调试 /media/ 404 问题

set -e

NGINX_CONF="/etc/nginx/sites-available/sw_project.conf"
MEDIA_PATH="/var/www/sw_project/backend/media"
TEST_FILE="images/shuku/20230117060717958223.jpg"

echo "=========================================="
echo "调试 /media/ 404 问题"
echo "=========================================="
echo ""

# 1. 检查 /media/ location 配置
echo "1. 检查 /media/ location 配置..."
echo ""
grep -A 5 "location /media/" "$NGINX_CONF" | sed 's/^/  /'
echo ""

# 2. 提取 alias 路径
ALIAS_PATH=$(grep -A 3 "location /media/" "$NGINX_CONF" | grep "alias" | awk '{print $2}' | sed 's/;//' | sed 's/$//')
echo "2. alias 路径分析:"
echo "  配置的 alias: $ALIAS_PATH"
echo "  期望的路径: $MEDIA_PATH"
echo ""

# 3. 检查路径匹配
if [ -n "$ALIAS_PATH" ]; then
    # 移除末尾斜杠进行比较
    ALIAS_CLEAN=$(echo "$ALIAS_PATH" | sed 's|/$||')
    MEDIA_CLEAN=$(echo "$MEDIA_PATH" | sed 's|/$||')
    
    if [ "$ALIAS_CLEAN" = "$MEDIA_CLEAN" ]; then
        echo -e "  ✓ alias 路径匹配"
    else
        echo -e "  ✗ alias 路径不匹配！"
        echo "    配置: $ALIAS_CLEAN"
        echo "    期望: $MEDIA_CLEAN"
    fi
    
    # 检查路径是否存在
    if [ -d "$ALIAS_PATH" ]; then
        echo -e "  ✓ alias 路径存在"
    else
        echo -e "  ✗ alias 路径不存在: $ALIAS_PATH"
    fi
fi
echo ""

# 4. 测试文件路径
echo "3. 测试文件路径..."
FULL_PATH="$MEDIA_PATH/$TEST_FILE"
if [ -f "$FULL_PATH" ]; then
    echo -e "  ✓ 文件存在: $FULL_PATH"
    
    # 如果使用 alias，检查 alias 路径下的文件
    if [ -n "$ALIAS_PATH" ]; then
        ALIAS_FILE="$ALIAS_PATH/$TEST_FILE"
        if [ -f "$ALIAS_FILE" ]; then
            echo -e "  ✓ alias 路径下的文件存在: $ALIAS_FILE"
        else
            echo -e "  ✗ alias 路径下的文件不存在: $ALIAS_FILE"
            echo "    这可能是问题所在！"
        fi
    fi
else
    echo -e "  ✗ 文件不存在: $FULL_PATH"
fi
echo ""

# 5. 检查 Nginx 配置语法
echo "4. 检查 Nginx 配置语法..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo -e "  ✓ 配置语法正确"
else
    echo -e "  ✗ 配置语法错误"
    sudo nginx -t
fi
echo ""

# 6. 检查 Nginx 错误日志
echo "5. 检查 Nginx 错误日志..."
ERROR_LOG="/var/log/nginx/sw_project_error.log"
if [ -f "$ERROR_LOG" ]; then
    echo "  最近的错误:"
    sudo tail -5 "$ERROR_LOG" | grep -i "media\|404\|$TEST_FILE" | sed 's/^/    /' || echo "    无相关错误"
else
    echo "  错误日志文件不存在"
fi
echo ""

# 7. 提供修复建议
echo "=========================================="
echo "修复建议"
echo "=========================================="
echo ""

if [ -n "$ALIAS_PATH" ] && [ "$ALIAS_PATH" != "$MEDIA_PATH" ] && [ "$ALIAS_PATH" != "$MEDIA_PATH/" ]; then
    echo "问题：alias 路径不匹配"
    echo ""
    echo "修复方法："
    echo "  sudo nano /etc/nginx/sites-available/sw_project.conf"
    echo ""
    echo "  找到 location /media/ 块，确保 alias 是："
    echo "    alias /var/www/sw_project/backend/media/;"
    echo ""
    echo "  注意：末尾必须有斜杠！"
elif [ ! -f "$ALIAS_PATH/$TEST_FILE" ] && [ -f "$FULL_PATH" ]; then
    echo "问题：alias 路径下的文件路径不匹配"
    echo ""
    echo "检查 alias 路径末尾是否有斜杠"
    echo "  正确: alias /var/www/sw_project/backend/media/;"
    echo "  错误: alias /var/www/sw_project/backend/media;"
else
    echo "如果以上都正确，尝试："
    echo "  1. 完全重启 Nginx: sudo systemctl restart nginx"
    echo "  2. 检查是否有其他 location 匹配了 /media/ 请求"
    echo "  3. 查看详细错误日志: sudo tail -f /var/log/nginx/sw_project_error.log"
fi
echo ""

