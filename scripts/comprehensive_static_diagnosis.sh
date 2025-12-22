#!/bin/bash

# 全面诊断静态文件问题
# 使用方法：在项目根目录运行 ./scripts/comprehensive_static_diagnosis.sh

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "全面诊断静态文件问题"
echo "=========================================="
echo ""

PROJECT_PATH="/var/www/sw_project"
STATICFILES_PATH="$PROJECT_PATH/backend/staticfiles"
NGINX_CONF="/etc/nginx/sites-available/sw_project.conf"

# 1. 检查文件是否存在
echo "=========================================="
echo "1. 检查文件是否存在"
echo "=========================================="

TEST_FILES=(
    "unfold/css/custom.css"
    "unfold/css/styles.css"
    "unfold/js/app.js"
    "unfold/fonts/inter/styles.css"
)

for file in "${TEST_FILES[@]}"; do
    if [ -f "$STATICFILES_PATH/$file" ]; then
        SIZE=$(stat -f%z "$STATICFILES_PATH/$file" 2>/dev/null || stat -c%s "$STATICFILES_PATH/$file" 2>/dev/null || echo "0")
        echo -e "${GREEN}✓${NC} $file (大小: $SIZE 字节)"
    else
        echo -e "${RED}✗${NC} $file (不存在)"
    fi
done
echo ""

# 2. 检查文件权限
echo "=========================================="
echo "2. 检查文件权限和所有者"
echo "=========================================="

if [ -d "$STATICFILES_PATH" ]; then
    echo "staticfiles 目录:"
    ls -ld "$STATICFILES_PATH" | awk '{print "  权限: " $1 "  所有者: " $3 ":" $4 "  路径: " $9}'
    echo ""
    
    echo "unfold 目录:"
    if [ -d "$STATICFILES_PATH/unfold" ]; then
        ls -ld "$STATICFILES_PATH/unfold" | awk '{print "  权限: " $1 "  所有者: " $3 ":" $4 "  路径: " $9}'
    else
        echo -e "${RED}✗${NC} unfold 目录不存在"
    fi
    echo ""
    
    echo "测试文件权限:"
    if [ -f "$STATICFILES_PATH/unfold/css/custom.css" ]; then
        ls -l "$STATICFILES_PATH/unfold/css/custom.css" | awk '{print "  权限: " $1 "  所有者: " $3 ":" $4 "  文件: " $9}'
        
        # 测试 www-data 是否可以读取
        if sudo -u www-data test -r "$STATICFILES_PATH/unfold/css/custom.css" 2>/dev/null; then
            echo -e "  ${GREEN}✓${NC} www-data 用户可以读取"
        else
            echo -e "  ${RED}✗${NC} www-data 用户无法读取"
        fi
    fi
fi
echo ""

# 3. 检查 Nginx 配置
echo "=========================================="
echo "3. 检查 Nginx 配置"
echo "=========================================="

if [ -f "$NGINX_CONF" ]; then
    echo -e "${GREEN}✓${NC} Nginx 配置文件存在"
    
    # 检查 /static/ location
    if grep -q "location /static/" "$NGINX_CONF"; then
        echo -e "${GREEN}✓${NC} 找到 /static/ location 配置"
        
        # 提取 alias 路径
        ALIAS_LINE=$(grep -A 3 "location /static/" "$NGINX_CONF" | grep "alias")
        if [ -n "$ALIAS_LINE" ]; then
            ALIAS_PATH=$(echo "$ALIAS_LINE" | awk '{print $2}' | sed 's/;//' | sed 's/$//')
            echo "  alias 路径: $ALIAS_PATH"
            
            # 检查路径是否存在
            if [ -d "$ALIAS_PATH" ]; then
                echo -e "  ${GREEN}✓${NC} alias 路径存在"
            else
                echo -e "  ${RED}✗${NC} alias 路径不存在"
            fi
            
            # 检查路径是否匹配
            if [ "$ALIAS_PATH" = "$STATICFILES_PATH" ] || [ "$ALIAS_PATH" = "$STATICFILES_PATH/" ]; then
                echo -e "  ${GREEN}✓${NC} alias 路径匹配"
            else
                echo -e "  ${YELLOW}⚠${NC} alias 路径可能不匹配"
                echo "    配置: $ALIAS_PATH"
                echo "    实际: $STATICFILES_PATH"
            fi
        fi
        
        # 显示完整的 location 配置
        echo ""
        echo "完整的 /static/ location 配置:"
        grep -A 5 "location /static/" "$NGINX_CONF" | sed 's/^/  /'
    else
        echo -e "${RED}✗${NC} 未找到 /static/ location 配置"
    fi
else
    echo -e "${RED}✗${NC} Nginx 配置文件不存在: $NGINX_CONF"
fi
echo ""

# 4. 检查 Nginx 配置顺序
echo "=========================================="
echo "4. 检查 Nginx location 顺序"
echo "=========================================="

if [ -f "$NGINX_CONF" ]; then
    # 查找 /static/ 和 / 的位置
    STATIC_LINE=$(grep -n "location /static/" "$NGINX_CONF" | cut -d: -f1)
    ROOT_LINE=$(grep -n "location / {" "$NGINX_CONF" | cut -d: -f1)
    
    if [ -n "$STATIC_LINE" ] && [ -n "$ROOT_LINE" ]; then
        if [ "$STATIC_LINE" -lt "$ROOT_LINE" ]; then
            echo -e "${GREEN}✓${NC} /static/ 在 / 之前（正确顺序）"
        else
            echo -e "${RED}✗${NC} /static/ 在 / 之后（错误顺序！）"
            echo "  这会导致 /static/ 请求被前端路由捕获"
        fi
        echo "  /static/ 在第 $STATIC_LINE 行"
        echo "  / 在第 $ROOT_LINE 行"
    fi
fi
echo ""

# 5. 测试 Nginx 配置
echo "=========================================="
echo "5. 测试 Nginx 配置"
echo "=========================================="

if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo -e "${GREEN}✓${NC} Nginx 配置测试通过"
else
    echo -e "${RED}✗${NC} Nginx 配置测试失败"
    sudo nginx -t
fi
echo ""

# 6. 检查 Nginx 错误日志
echo "=========================================="
echo "6. 检查最近的 Nginx 错误日志"
echo "=========================================="

ERROR_LOG="/var/log/nginx/sw_project_error.log"
if [ -f "$ERROR_LOG" ]; then
    echo "最近 10 条错误日志（与 static 相关）:"
    sudo tail -20 "$ERROR_LOG" | grep -i "static\|404\|403\|permission" | tail -10 || echo "  无相关错误"
else
    echo "错误日志文件不存在: $ERROR_LOG"
    echo "检查通用错误日志:"
    sudo tail -10 /var/log/nginx/error.log 2>/dev/null | grep -i "static\|404\|403" || echo "  无相关错误"
fi
echo ""

# 7. 测试文件访问（模拟 Nginx）
echo "=========================================="
echo "7. 测试文件访问（模拟 Nginx）"
echo "=========================================="

if [ -f "$STATICFILES_PATH/unfold/css/custom.css" ]; then
    echo "测试文件: $STATICFILES_PATH/unfold/css/custom.css"
    
    # 以 www-data 用户测试
    if sudo -u www-data cat "$STATICFILES_PATH/unfold/css/custom.css" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} www-data 用户可以读取文件内容"
    else
        echo -e "${RED}✗${NC} www-data 用户无法读取文件内容"
        echo "  错误信息:"
        sudo -u www-data cat "$STATICFILES_PATH/unfold/css/custom.css" 2>&1 || true
    fi
fi
echo ""

# 8. 检查 SELinux（如果启用）
echo "=========================================="
echo "8. 检查 SELinux"
echo "=========================================="

if command -v getenforce &> /dev/null; then
    SELINUX_STATUS=$(getenforce 2>/dev/null || echo "未安装")
    echo "SELinux 状态: $SELINUX_STATUS"
    
    if [ "$SELINUX_STATUS" = "Enforcing" ]; then
        echo -e "${YELLOW}⚠${NC} SELinux 已启用，可能阻止文件访问"
        echo "  如果确认是 SELinux 问题，运行:"
        echo "  sudo chcon -R -t httpd_sys_content_t $STATICFILES_PATH"
    fi
else
    echo "SELinux 未安装或未启用"
fi
echo ""

# 9. 检查文件系统权限
echo "=========================================="
echo "9. 检查父目录权限"
echo "=========================================="

check_path() {
    local path=$1
    if [ -d "$path" ]; then
        PERMS=$(stat -c '%a' "$path" 2>/dev/null || stat -f '%A' "$path" 2>/dev/null || echo "未知")
        OWNER=$(stat -c '%U:%G' "$path" 2>/dev/null || stat -f '%Su:%Sg' "$path" 2>/dev/null || echo "未知")
        echo "  $path"
        echo "    权限: $PERMS  所有者: $OWNER"
        
        # 检查是否可执行（目录需要执行权限才能进入）
        if [ ! -x "$path" ]; then
            echo -e "    ${RED}✗${NC} 缺少执行权限（无法进入目录）"
        fi
    fi
}

check_path "/var/www"
check_path "/var/www/sw_project"
check_path "/var/www/sw_project/backend"
check_path "/var/www/sw_project/backend/staticfiles"
echo ""

# 10. 提供修复建议
echo "=========================================="
echo "诊断总结和建议"
echo "=========================================="
echo ""

echo "如果文件存在但无法访问，请尝试："
echo ""
echo "1. 确保所有父目录都有执行权限："
echo "   sudo find /var/www/sw_project/backend/staticfiles -type d -exec chmod 755 {} \\;"
echo ""
echo "2. 确保所有文件都有读取权限："
echo "   sudo find /var/www/sw_project/backend/staticfiles -type f -exec chmod 644 {} \\;"
echo ""
echo "3. 确保所有者是 www-data："
echo "   sudo chown -R www-data:www-data /var/www/sw_project/backend/staticfiles/"
echo ""
echo "4. 如果使用 SELinux："
echo "   sudo chcon -R -t httpd_sys_content_t /var/www/sw_project/backend/staticfiles/"
echo ""
echo "5. 重载 Nginx："
echo "   sudo systemctl reload nginx"
echo ""
echo "6. 清除浏览器缓存并测试"
echo ""

