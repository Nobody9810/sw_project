#!/bin/bash

# 清理 Git 历史中的大文件
# 使用方法: bash clean_git_history.sh

echo "开始清理 Git 历史中的大文件..."

# 从 Git 历史中移除所有 PDF 文件
echo "移除所有 PDF 文件..."
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch 'backend/media/**/*.pdf' 'backend/media/**/*.jpg' 'backend/media/**/*.jpeg' 'backend/media/**/*.png' 'backend/media/**/*.webp' 'backend/media/**/*.jfif' 'backend/media/**/*.JPG' 'backend/media/**/*.JPEG' 'backend/media/**/*.PNG' 'backend/media/**/*.mp4' 'backend/media/**/*.mp3' 'backend/media/**/*.avi' 'backend/media/**/*.mov'" \
  --prune-empty --tag-name-filter cat -- --all

# 清理引用
echo "清理引用..."
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d

# 清理和压缩
echo "清理和压缩仓库..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo "清理完成！"
echo ""
echo "现在您可以运行以下命令强制推送："
echo "git push origin main --force"
echo ""
echo "⚠️  警告：强制推送会重写远程仓库历史，请确保团队其他成员知道这个操作！"

