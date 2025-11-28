#!/bin/bash
# 部署前检查脚本
# 用于检查项目是否准备好部署到生产环境

echo "=========================================="
echo "生产环境部署检查"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查结果
PASSED=0
FAILED=0

# 检查函数
check_item() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $1"
        ((FAILED++))
    fi
}

# 1. 检查后端文件
echo "1. 检查后端文件..."
[ -f "backend/shuwei/wsgi.py" ] && check_item "wsgi.py 存在" || check_item "wsgi.py 不存在"
[ -f "backend/shuwei/settings.py" ] && check_item "settings.py 存在" || check_item "settings.py 不存在"
[ -f "backend/requirements.txt" ] && check_item "requirements.txt 存在" || check_item "requirements.txt 不存在"
[ -f "backend/manage.py" ] && check_item "manage.py 存在" || check_item "manage.py 不存在"
echo ""

# 2. 检查前端文件
echo "2. 检查前端文件..."
[ -f "frontend/package.json" ] && check_item "package.json 存在" || check_item "package.json 不存在"
[ -f "frontend/vite.config.ts" ] && check_item "vite.config.ts 存在" || check_item "vite.config.ts 不存在"
[ -d "frontend/src" ] && check_item "src 目录存在" || check_item "src 目录不存在"
echo ""

# 3. 检查环境变量文件
echo "3. 检查环境变量配置..."
if [ -f ".env" ]; then
    check_item ".env 文件存在"
    
    # 检查关键配置
    if grep -q "DJANGO_ENV=production" .env 2>/dev/null; then
        check_item "DJANGO_ENV 设置为 production"
    else
        echo -e "${YELLOW}⚠${NC} DJANGO_ENV 未设置为 production（开发环境）"
    fi
    
    if grep -q "DEBUG=False" .env 2>/dev/null; then
        check_item "DEBUG 设置为 False"
    else
        echo -e "${YELLOW}⚠${NC} DEBUG 未设置为 False"
    fi
    
    if grep -q "ALLOWED_HOSTS=" .env 2>/dev/null; then
        check_item "ALLOWED_HOSTS 已配置"
    else
        echo -e "${YELLOW}⚠${NC} ALLOWED_HOSTS 未配置"
    fi
else
    echo -e "${YELLOW}⚠${NC} .env 文件不存在（可以使用 env.example 作为模板）"
fi
echo ""

# 4. 检查 Python 环境
echo "4. 检查 Python 环境..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1)
    check_item "Python 已安装: $PYTHON_VERSION"
else
    check_item "Python 未安装"
fi

if [ -d "venv" ]; then
    check_item "虚拟环境目录存在"
else
    echo -e "${YELLOW}⚠${NC} 虚拟环境目录不存在（部署时需要创建）"
fi
echo ""

# 5. 检查 Node.js 环境
echo "5. 检查 Node.js 环境..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version 2>&1)
    check_item "Node.js 已安装: $NODE_VERSION"
else
    check_item "Node.js 未安装"
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version 2>&1)
    check_item "npm 已安装: $NPM_VERSION"
else
    check_item "npm 未安装"
fi
echo ""

# 6. 检查前端构建
echo "6. 检查前端构建..."
if [ -d "frontend/dist" ]; then
    check_item "前端构建目录存在"
    if [ -f "frontend/dist/index.html" ]; then
        check_item "index.html 存在"
    else
        check_item "index.html 不存在（需要运行 npm run build）"
    fi
else
    echo -e "${YELLOW}⚠${NC} 前端构建目录不存在（需要运行 npm run build）"
fi
echo ""

# 7. 检查后端静态文件
echo "7. 检查后端静态文件..."
if [ -d "backend/staticfiles" ]; then
    check_item "静态文件目录存在"
else
    echo -e "${YELLOW}⚠${NC} 静态文件目录不存在（需要运行 collectstatic）"
fi
echo ""

# 总结
echo "=========================================="
echo "检查总结"
echo "=========================================="
echo -e "${GREEN}通过: $PASSED${NC}"
echo -e "${RED}失败: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ 所有检查项通过！项目可以部署到生产环境。${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ 部分检查项未通过，请根据上述提示进行修复。${NC}"
    exit 1
fi

