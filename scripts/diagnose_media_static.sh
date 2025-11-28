#!/bin/bash

# 诊断脚本：检查 media 和 staticfiles 的配置问题
# 使用方法：sudo bash scripts/diagnose_media_static.sh

echo "=========================================="
echo "Media 和 Staticfiles 诊断脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目路径（根据实际情况修改）
PROJECT_ROOT="/var/www/sw_project"
BACKEND_DIR="$PROJECT_ROOT/backend"
STATICFILES_DIR="$BACKEND_DIR/staticfiles"
MEDIA_DIR="$BACKEND_DIR/media"
NGINX_USER="www-data"

echo "1. 检查目录是否存在..."
echo "----------------------------------------"

if [ -d "$STATICFILES_DIR" ]; then
    echo -e "${GREEN}✓${NC} staticfiles 目录存在: $STATICFILES_DIR"
else
    echo -e "${RED}✗${NC} staticfiles 目录不存在: $STATICFILES_DIR"
    echo "  请运行: python manage.py collectstatic"
fi

if [ -d "$MEDIA_DIR" ]; then
    echo -e "${GREEN}✓${NC} media 目录存在: $MEDIA_DIR"
else
    echo -e "${YELLOW}⚠${NC} media 目录不存在: $MEDIA_DIR"
    echo "  如果还没有上传文件，这是正常的"
fi

echo ""
echo "2. 检查文件权限..."
echo "----------------------------------------"

if [ -d "$STATICFILES_DIR" ]; then
    STATIC_OWNER=$(stat -c '%U:%G' "$STATICFILES_DIR")
    STATIC_PERM=$(stat -c '%a' "$STATICFILES_DIR")
    echo "staticfiles 目录权限: $STATIC_PERM (所有者: $STATIC_OWNER)"
    
    if [ "$STATIC_OWNER" = "$NGINX_USER:$NGINX_USER" ] || [ "$STATIC_OWNER" = "root:$NGINX_USER" ]; then
        echo -e "${GREEN}✓${NC} 所有者正确"
    else
        echo -e "${YELLOW}⚠${NC} 所有者可能不正确，建议: $NGINX_USER:$NGINX_USER"
        echo "  修复命令: sudo chown -R $NGINX_USER:$NGINX_USER $STATICFILES_DIR"
    fi
    
    if [ "$STATIC_PERM" = "755" ] || [ "$STATIC_PERM" = "750" ]; then
        echo -e "${GREEN}✓${NC} 目录权限正确"
    else
        echo -e "${YELLOW}⚠${NC} 目录权限建议: 755 或 750"
        echo "  修复命令: sudo chmod -R 755 $STATICFILES_DIR"
    fi
fi

if [ -d "$MEDIA_DIR" ]; then
    MEDIA_OWNER=$(stat -c '%U:%G' "$MEDIA_DIR")
    MEDIA_PERM=$(stat -c '%a' "$MEDIA_DIR")
    echo "media 目录权限: $MEDIA_PERM (所有者: $MEDIA_OWNER)"
    
    if [ "$MEDIA_OWNER" = "$NGINX_USER:$NGINX_USER" ] || [ "$MEDIA_OWNER" = "root:$NGINX_USER" ]; then
        echo -e "${GREEN}✓${NC} 所有者正确"
    else
        echo -e "${YELLOW}⚠${NC} 所有者可能不正确，建议: $NGINX_USER:$NGINX_USER"
        echo "  修复命令: sudo chown -R $NGINX_USER:$NGINX_USER $MEDIA_DIR"
    fi
    
    if [ "$MEDIA_PERM" = "755" ] || [ "$MEDIA_PERM" = "750" ]; then
        echo -e "${GREEN}✓${NC} 目录权限正确"
    else
        echo -e "${YELLOW}⚠${NC} 目录权限建议: 755 或 750"
        echo "  修复命令: sudo chmod -R 755 $MEDIA_DIR"
    fi
fi

echo ""
echo "3. 检查 nginx 配置..."
echo "----------------------------------------"

NGINX_CONFIG="/etc/nginx/sites-available/sw_project"
if [ -f "$NGINX_CONFIG" ]; then
    echo -e "${GREEN}✓${NC} nginx 配置文件存在: $NGINX_CONFIG"
    
    # 检查 location 顺序
    STATIC_LINE=$(grep -n "location /static/" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
    MEDIA_LINE=$(grep -n "location /media/" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
    REGEX_LINE=$(grep -n "location ~\*" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
    ROOT_LINE=$(grep -n "location / {" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
    
    if [ -n "$STATIC_LINE" ] && [ -n "$REGEX_LINE" ]; then
        if [ "$STATIC_LINE" -lt "$REGEX_LINE" ]; then
            echo -e "${GREEN}✓${NC} /static/ location 在正则匹配之前（正确）"
        else
            echo -e "${RED}✗${NC} /static/ location 在正则匹配之后（错误！）"
            echo "  这会导致 /static/ 下的文件被错误匹配"
        fi
    fi
    
    if [ -n "$MEDIA_LINE" ] && [ -n "$REGEX_LINE" ]; then
        if [ "$MEDIA_LINE" -lt "$REGEX_LINE" ]; then
            echo -e "${GREEN}✓${NC} /media/ location 在正则匹配之前（正确）"
        else
            echo -e "${RED}✗${NC} /media/ location 在正则匹配之后（错误！）"
            echo "  这会导致 /media/ 下的文件被错误匹配"
        fi
    fi
    
    # 检查路径配置
    STATIC_ALIAS=$(grep -A 2 "location /static/" "$NGINX_CONFIG" | grep "alias" | awk '{print $2}' | tr -d ';')
    MEDIA_ALIAS=$(grep -A 2 "location /media/" "$NGINX_CONFIG" | grep "alias" | awk '{print $2}' | tr -d ';')
    
    echo "staticfiles alias: $STATIC_ALIAS"
    if [ -d "$STATIC_ALIAS" ]; then
        echo -e "${GREEN}✓${NC} alias 路径存在"
    else
        echo -e "${RED}✗${NC} alias 路径不存在: $STATIC_ALIAS"
    fi
    
    echo "media alias: $MEDIA_ALIAS"
    if [ -d "$MEDIA_ALIAS" ]; then
        echo -e "${GREEN}✓${NC} alias 路径存在"
    else
        echo -e "${YELLOW}⚠${NC} alias 路径不存在: $MEDIA_ALIAS"
        echo "  如果还没有上传文件，这是正常的"
    fi
else
    echo -e "${RED}✗${NC} nginx 配置文件不存在: $NGINX_CONFIG"
fi

echo ""
echo "4. 测试文件访问..."
echo "----------------------------------------"

# 检查是否有测试文件
if [ -d "$STATICFILES_DIR" ]; then
    TEST_FILE=$(find "$STATICFILES_DIR" -type f -name "*.css" -o -name "*.js" | head -1)
    if [ -n "$TEST_FILE" ]; then
        echo "测试文件: $TEST_FILE"
        if [ -r "$TEST_FILE" ]; then
            echo -e "${GREEN}✓${NC} nginx 用户可以读取文件"
        else
            echo -e "${RED}✗${NC} nginx 用户无法读取文件"
            echo "  修复命令: sudo chmod -R 644 $STATICFILES_DIR/* && sudo find $STATICFILES_DIR -type d -exec chmod 755 {} \\;"
        fi
    else
        echo -e "${YELLOW}⚠${NC} 未找到测试文件，请先运行 collectstatic"
    fi
fi

if [ -d "$MEDIA_DIR" ]; then
    TEST_FILE=$(find "$MEDIA_DIR" -type f | head -1)
    if [ -n "$TEST_FILE" ]; then
        echo "测试文件: $TEST_FILE"
        if [ -r "$TEST_FILE" ]; then
            echo -e "${GREEN}✓${NC} nginx 用户可以读取文件"
        else
            echo -e "${RED}✗${NC} nginx 用户无法读取文件"
            echo "  修复命令: sudo chmod -R 644 $MEDIA_DIR/* && sudo find $MEDIA_DIR -type d -exec chmod 755 {} \\;"
        fi
    else
        echo -e "${YELLOW}⚠${NC} media 目录为空（如果还没有上传文件，这是正常的）"
    fi
fi

echo ""
echo "5. 检查 nginx 错误日志..."
echo "----------------------------------------"
ERROR_LOG="/var/log/nginx/sw_project_error.log"
if [ -f "$ERROR_LOG" ]; then
    echo "最近的错误日志（最后10行）:"
    tail -10 "$ERROR_LOG" | grep -i "static\|media\|permission\|denied\|404" || echo "  未发现相关错误"
else
    echo -e "${YELLOW}⚠${NC} 错误日志文件不存在: $ERROR_LOG"
fi

echo ""
echo "6. 检查 SELinux（如果启用）..."
echo "----------------------------------------"
if command -v getenforce &> /dev/null; then
    SELINUX_STATUS=$(getenforce)
    echo "SELinux 状态: $SELINUX_STATUS"
    if [ "$SELINUX_STATUS" = "Enforcing" ]; then
        echo -e "${YELLOW}⚠${NC} SELinux 已启用，可能需要设置上下文"
        echo "  检查命令: ls -Z $STATICFILES_DIR"
        echo "  修复命令: sudo chcon -R -t httpd_sys_content_t $STATICFILES_DIR"
        echo "  修复命令: sudo chcon -R -t httpd_sys_content_t $MEDIA_DIR"
    fi
else
    echo "SELinux 未安装或未启用"
fi

echo ""
echo "=========================================="
echo "诊断完成！"
echo "=========================================="
echo ""
echo "如果发现问题，请按照上面的提示修复。"
echo "修复后，请执行："
echo "  1. sudo nginx -t          # 测试 nginx 配置"
echo "  2. sudo systemctl reload nginx  # 重载 nginx"
echo "  3. 清除浏览器缓存并刷新页面"

