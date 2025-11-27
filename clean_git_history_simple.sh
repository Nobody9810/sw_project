#!/bin/bash

# 清理 Git 历史中的大文件 - 简化版本
# 使用方法: bash clean_git_history_simple.sh

echo "=========================================="
echo "清理 Git 历史中的大文件"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -d ".git" ]; then
    echo "错误：当前目录不是 Git 仓库！"
    exit 1
fi

# 检查是否有未暂存的更改
echo "步骤 0: 检查工作区状态..."
if ! git diff-index --quiet HEAD --; then
    echo "检测到未暂存的更改，正在暂存..."
    git add -A
    
    echo "提交更改..."
    git commit -m "chore: 更新 .gitignore 并准备清理 Git 历史"
    echo "✅ 更改已提交"
    echo ""
fi

echo "步骤 1: 从 Git 历史中移除 media 目录中的所有文件..."
echo "这可能需要几分钟时间，请耐心等待..."
echo ""

# 使用 git filter-branch 移除 media 目录
# 设置环境变量以忽略警告
export FILTER_BRANCH_SQUELCH_WARNING=1

git filter-branch --force --index-filter \
  "git rm -rf --cached --ignore-unmatch backend/media" \
  --prune-empty --tag-name-filter cat -- --all

if [ $? -eq 0 ]; then
    echo ""
    echo "步骤 2: 清理引用..."
    git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d 2>/dev/null || true
    
    echo "步骤 3: 清理和压缩仓库..."
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive
    
    echo ""
    echo "=========================================="
    echo "✅ 清理完成！"
    echo "=========================================="
    echo ""
    echo "下一步操作："
    echo "1. 检查仓库大小: git count-objects -vH"
    echo "2. 强制推送到远程: git push origin main --force"
    echo ""
    echo "⚠️  重要提示："
    echo "   - 强制推送会重写远程仓库历史"
    echo "   - 请确保团队其他成员知道这个操作"
    echo "   - 建议先备份远程仓库"
    echo ""
else
    echo ""
    echo "❌ 清理过程中出现错误，请检查错误信息"
    exit 1
fi

