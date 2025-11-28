#!/bin/bash

# 验证 Nginx 配置并诊断问题

set -e

NGINX_CONF="/etc/nginx/sites-available/sw_project.conf"

echo "=========================================="
echo "验证 Nginx 配置"
echo "=========================================="
echo ""

# 1. 检查 location 顺序
echo "1. 检查 location 顺序..."
echo ""

# 查找所有 location
echo "所有 location 及其行号:"
grep -n "location" "$NGINX_CONF" | sed 's/^/  /'
echo ""

# 检查关键 location 的顺序
STATIC_LINE=$(grep -n "location /static/" "$NGINX_CONF" | cut -d: -f1)
MEDIA_LINE=$(grep -n "location /media/" "$NGINX_CONF" | cut -d: -f1)
REGEX_LINE=$(grep -n "location ~\*" "$NGINX_CONF" | cut -d: -f1)
ROOT_LINE=$(grep -n "^    location / {" "$NGINX_CONF" | cut -d: -f1)

if [ -n "$STATIC_LINE" ] && [ -n "$MEDIA_LINE" ] && [ -n "$REGEX_LINE" ]; then
    echo "Location 顺序检查:"
    echo "  /static/ 在第 $STATIC_LINE 行"
    echo "  /media/ 在第 $MEDIA_LINE 行"
    echo "  正则 ~* 在第 $REGEX_LINE 行"
    echo "  / 在第 $ROOT_LINE 行"
    echo ""
    
    if [ "$STATIC_LINE" -lt "$REGEX_LINE" ] && [ "$MEDIA_LINE" -lt "$REGEX_LINE" ]; then
        echo -e "  ✓ Location 顺序正确（/static/ 和 /media/ 在正则之前）"
    else
        echo -e "  ✗ Location 顺序错误！"
        echo "    /static/ 和 /media/ 必须在正则 location 之前"
    fi
fi
echo ""

# 2. 检查 /media/ location 配置
echo "2. 检查 /media/ location 配置..."
if grep -A 5 "location /media/" "$NGINX_CONF" | grep -q "alias"; then
    echo -e "  ✓ /media/ location 配置存在"
    echo ""
    echo "  完整配置:"
    grep -A 5 "location /media/" "$NGINX_CONF" | sed 's/^/    /'
else
    echo -e "  ✗ /media/ location 配置有问题"
fi
echo ""

# 3. 检查文件权限
echo "3. 检查文件权限..."
MEDIA_PATH="/var/www/sw_project/backend/media"
if [ -d "$MEDIA_PATH" ]; then
    echo "  媒体文件目录: $MEDIA_PATH"
    ls -ld "$MEDIA_PATH" | awk '{print "    权限: " $1 "  所有者: " $3 ":" $4}'
    
    # 检查示例图片文件
    SAMPLE_IMAGE=$(find "$MEDIA_PATH" -type f \( -name "*.jpg" -o -name "*.png" -o -name "*.jpeg" \) | head -1)
    if [ -n "$SAMPLE_IMAGE" ]; then
        echo ""
        echo "  示例图片文件:"
        ls -l "$SAMPLE_IMAGE" | awk '{print "    权限: " $1 "  所有者: " $3 ":" $4 "  文件: " $9}'
        
        # 测试 www-data 是否可以读取
        if sudo -u www-data test -r "$SAMPLE_IMAGE" 2>/dev/null; then
            echo -e "    ✓ www-data 用户可以读取"
        else
            echo -e "    ✗ www-data 用户无法读取"
        fi
    else
        echo "    未找到示例图片文件"
    fi
else
    echo -e "  ✗ 媒体文件目录不存在"
fi
echo ""

# 4. 测试 Nginx 配置
echo "4. 测试 Nginx 配置..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo -e "  ✓ 配置测试通过"
else
    echo -e "  ✗ 配置测试失败"
    sudo nginx -t
fi
echo ""

# 5. 检查 Nginx 进程
echo "5. 检查 Nginx 进程..."
if systemctl is-active --quiet nginx; then
    echo -e "  ✓ Nginx 正在运行"
    
    # 检查 worker 进程
    WORKER_COUNT=$(ps aux | grep "nginx: worker" | grep -v grep | wc -l)
    echo "  Worker 进程数: $WORKER_COUNT"
else
    echo -e "  ✗ Nginx 未运行"
fi
echo ""

# 6. 检查最近的错误日志
echo "6. 检查最近的错误日志（与 media 相关）..."
ERROR_LOG="/var/log/nginx/sw_project_error.log"
if [ -f "$ERROR_LOG" ]; then
    echo "  最近的 media 相关错误:"
    sudo tail -20 "$ERROR_LOG" | grep -i "media\|404\|403\|permission" | tail -5 || echo "    无相关错误"
else
    echo "  错误日志文件不存在"
fi
echo ""

echo "=========================================="
echo "诊断建议"
echo "=========================================="
echo ""
echo "如果配置正确但仍无法加载图片，请尝试："
echo ""
echo "1. 完全重启 Nginx（而不是 reload）:"
echo "   sudo systemctl restart nginx"
echo ""
echo "2. 清除浏览器缓存（重要！）:"
echo "   - Chrome/Edge: Ctrl+Shift+Delete"
echo "   - 或使用无痕模式测试"
echo ""
echo "3. 检查浏览器开发者工具:"
echo "   - 打开 Network 标签"
echo "   - 查看图片请求的 URL 和状态码"
echo ""
echo "4. 测试直接访问图片 URL:"
echo "   curl -I https://www.shuwei365.com/media/images/shuku/xxx.jpg"
echo ""

