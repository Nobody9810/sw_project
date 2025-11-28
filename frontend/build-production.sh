#!/bin/bash

# 生产环境构建脚本
# 确保本地优化效果在生产环境保持一致

set -e  # 遇到错误立即退出

echo "🚀 开始生产环境构建..."

# 1. 清理旧构建
echo "📦 清理旧构建文件..."
rm -rf dist
rm -rf node_modules/.vite

# 2. 检查环境变量
echo "🔍 检查环境配置..."
if [ -f ".env.production" ]; then
    echo "✅ 找到 .env.production 文件"
    source .env.production
else
    echo "⚠️  未找到 .env.production 文件，使用默认配置"
fi

# 3. 安装依赖（确保版本一致）
echo "📥 安装依赖..."
npm ci

# 4. 类型检查
echo "🔎 运行 TypeScript 类型检查..."
npm run build -- --mode production 2>&1 | grep -E "(error|Error)" && exit 1 || true

# 5. 构建生产版本
echo "🏗️  构建生产版本..."
export NODE_ENV=production
npm run build

# 6. 验证构建结果
echo "✅ 验证构建结果..."
if [ ! -f "dist/index.html" ]; then
    echo "❌ 错误: dist/index.html 不存在"
    exit 1
fi

if [ ! -d "dist/assets" ]; then
    echo "❌ 错误: dist/assets 目录不存在"
    exit 1
fi

# 7. 检查文件大小
echo "📊 检查构建文件大小..."
JS_SIZE=$(du -sh dist/assets/js 2>/dev/null | cut -f1 || echo "0")
CSS_SIZE=$(du -sh dist/assets/css 2>/dev/null | cut -f1 || echo "0")
echo "  JS 文件大小: $JS_SIZE"
echo "  CSS 文件大小: $CSS_SIZE"

# 8. 检查是否有 source map（生产环境不应该有）
MAP_COUNT=$(find dist -name "*.map" 2>/dev/null | wc -l)
if [ "$MAP_COUNT" -gt 0 ]; then
    echo "⚠️  警告: 发现 $MAP_COUNT 个 source map 文件（生产环境建议移除）"
else
    echo "✅ 未发现 source map 文件"
fi

# 9. 检查 console.log（应该被移除）
echo "🔍 检查代码质量..."
if grep -r "console\.log" dist/assets/js/*.js 2>/dev/null | grep -v "console.error\|console.warn" > /dev/null; then
    echo "⚠️  警告: 发现 console.log（应该已被 terser 移除）"
else
    echo "✅ console.log 已正确移除"
fi

echo ""
echo "✨ 构建完成！"
echo "📁 构建输出目录: dist/"
echo ""
echo "📋 下一步："
echo "  1. 运行 'npm run preview' 本地测试"
echo "  2. 将 dist/ 目录内容部署到服务器"
echo "  3. 确保 Nginx 配置正确"
echo ""

