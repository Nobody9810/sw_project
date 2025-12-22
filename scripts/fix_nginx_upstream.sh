#!/bin/bash

# 修复 Nginx 配置文件，添加缺失的 upstream 块

set -e

NGINX_CONF="/etc/nginx/sites-available/sw_project.conf"
BACKUP_CONF="${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"

echo "=========================================="
echo "修复 Nginx upstream 配置"
echo "=========================================="
echo ""

# 1. 备份原文件
echo "1. 备份原配置文件..."
sudo cp "$NGINX_CONF" "$BACKUP_CONF"
echo -e "✓ 已备份到: $BACKUP_CONF"
echo ""

# 2. 检查是否已有 upstream 块
if grep -q "^upstream django" "$NGINX_CONF"; then
    echo -e "✓ upstream django 块已存在"
    exit 0
fi

# 3. 检查是否有 HTTP server 块
if grep -q "^server {" "$NGINX_CONF"; then
    FIRST_SERVER_LINE=$(grep -n "^server {" "$NGINX_CONF" | head -1 | cut -d: -f1)
    echo "第一个 server 块在第 $FIRST_SERVER_LINE 行"
    
    # 4. 在第一个 server 块之前插入 upstream 块
    echo "2. 添加 upstream django 块..."
    
    # 创建临时文件
    TEMP_FILE=$(mktemp)
    
    # 在第一个 server 块之前插入 upstream 块
    head -n $((FIRST_SERVER_LINE - 1)) "$NGINX_CONF" > "$TEMP_FILE"
    cat >> "$TEMP_FILE" << 'EOF'
# 上游服务器配置（Django/Gunicorn）
upstream django {
    server 127.0.0.1:8000;
}

EOF
    tail -n +$FIRST_SERVER_LINE "$NGINX_CONF" >> "$TEMP_FILE"
    
    # 替换原文件
    sudo mv "$TEMP_FILE" "$NGINX_CONF"
    sudo chown root:root "$NGINX_CONF"
    sudo chmod 644 "$NGINX_CONF"
    
    echo -e "✓ upstream django 块已添加"
else
    echo -e "✗ 未找到 server 块"
    exit 1
fi
echo ""

# 5. 验证配置
echo "3. 验证配置..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo -e "✓ 配置测试通过"
else
    echo -e "✗ 配置测试失败"
    echo "  恢复备份..."
    sudo mv "$BACKUP_CONF" "$NGINX_CONF"
    echo "  错误信息:"
    sudo nginx -t 2>&1 | grep -v "^$"
    exit 1
fi
echo ""

echo "=========================================="
echo "完成！"
echo "=========================================="
echo ""
echo "现在可以重载 Nginx:"
echo "  sudo systemctl reload nginx"
echo ""

