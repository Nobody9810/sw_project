#!/bin/bash

# 修复 Nginx 配置文件权限和符号链接

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "修复 Nginx 配置文件权限"
echo "=========================================="
echo ""

NGINX_AVAILABLE="/etc/nginx/sites-available/sw_project.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/sw_project.conf"

# 1. 检查文件是否存在
echo "1. 检查配置文件..."
if [ -f "$NGINX_AVAILABLE" ]; then
    echo -e "${GREEN}✓${NC} 配置文件存在: $NGINX_AVAILABLE"
else
    echo -e "${RED}✗${NC} 配置文件不存在: $NGINX_AVAILABLE"
    exit 1
fi
echo ""

# 2. 检查文件权限
echo "2. 检查当前权限..."
ls -la "$NGINX_AVAILABLE" | awk '{print "  权限: " $1 "  所有者: " $3 ":" $4 "  文件: " $9}'
echo ""

# 3. 修复文件权限
echo "3. 修复文件权限..."
sudo chown root:root "$NGINX_AVAILABLE"
sudo chmod 644 "$NGINX_AVAILABLE"
echo -e "${GREEN}✓${NC} 权限已修复"
echo ""

# 4. 验证权限
echo "4. 验证权限..."
ls -la "$NGINX_AVAILABLE" | awk '{print "  权限: " $1 "  所有者: " $3 ":" $4 "  文件: " $9}'
CURRENT_PERMS=$(stat -c '%a' "$NGINX_AVAILABLE" 2>/dev/null || stat -f '%A' "$NGINX_AVAILABLE" 2>/dev/null)
CURRENT_OWNER=$(stat -c '%U:%G' "$NGINX_AVAILABLE" 2>/dev/null || stat -f '%Su:%Sg' "$NGINX_AVAILABLE" 2>/dev/null)

if [ "$CURRENT_PERMS" = "644" ] && [ "$CURRENT_OWNER" = "root:root" ]; then
    echo -e "${GREEN}✓${NC} 权限正确"
else
    echo -e "${YELLOW}⚠${NC} 权限可能不正确"
fi
echo ""

# 5. 检查符号链接
echo "5. 检查符号链接..."
if [ -L "$NGINX_ENABLED" ]; then
    echo -e "${GREEN}✓${NC} 符号链接存在: $NGINX_ENABLED"
    ls -la "$NGINX_ENABLED" | awk '{print "  指向: " $10}'
    
    # 检查链接是否有效
    if [ -e "$NGINX_ENABLED" ]; then
        echo -e "${GREEN}✓${NC} 符号链接有效"
    else
        echo -e "${RED}✗${NC} 符号链接无效（指向不存在的文件）"
        echo "  重新创建符号链接..."
        sudo rm -f "$NGINX_ENABLED"
        sudo ln -s "$NGINX_AVAILABLE" "$NGINX_ENABLED"
        echo -e "${GREEN}✓${NC} 符号链接已重新创建"
    fi
elif [ -f "$NGINX_ENABLED" ]; then
    echo -e "${YELLOW}⚠${NC} sites-enabled 中存在文件而不是符号链接"
    echo "  建议删除并创建符号链接"
    read -p "是否删除并创建符号链接？(y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo rm -f "$NGINX_ENABLED"
        sudo ln -s "$NGINX_AVAILABLE" "$NGINX_ENABLED"
        echo -e "${GREEN}✓${NC} 符号链接已创建"
    fi
else
    echo -e "${RED}✗${NC} 符号链接不存在"
    echo "  创建符号链接..."
    sudo ln -s "$NGINX_AVAILABLE" "$NGINX_ENABLED"
    echo -e "${GREEN}✓${NC} 符号链接已创建"
fi
echo ""

# 6. 测试 Nginx 配置
echo "6. 测试 Nginx 配置..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo -e "${GREEN}✓${NC} Nginx 配置测试通过"
else
    echo -e "${RED}✗${NC} Nginx 配置测试失败"
    echo "  错误信息:"
    sudo nginx -t 2>&1 | grep -v "^$"
    exit 1
fi
echo ""

# 7. 检查 Nginx 是否正在运行
echo "7. 检查 Nginx 服务状态..."
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓${NC} Nginx 正在运行"
    echo ""
    echo "现在可以重载 Nginx:"
    echo "  sudo systemctl reload nginx"
else
    echo -e "${YELLOW}⚠${NC} Nginx 未运行"
    echo "  启动 Nginx:"
    echo "  sudo systemctl start nginx"
fi
echo ""

echo "=========================================="
echo "完成！"
echo "=========================================="
echo ""
echo "后续步骤："
echo "1. 如果配置测试通过，重载 Nginx:"
echo "   sudo systemctl reload nginx"
echo ""
echo "2. 如果配置测试失败，检查配置文件语法"
echo ""

