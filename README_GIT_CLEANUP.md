# Git 历史清理指南

## 问题描述

您的仓库中有大文件（PDF 文件）超过了 GitHub 的 100MB 限制，导致无法推送。

## 解决方案

### 方法 1: 使用提供的脚本（推荐）

1. **运行清理脚本**：
```bash
chmod +x clean_git_history_simple.sh
bash clean_git_history_simple.sh
```

2. **检查仓库大小**：
```bash
git count-objects -vH
```

3. **强制推送到远程**：
```bash
git push origin main --force
```

### 方法 2: 手动清理（如果脚本失败）

1. **从 Git 历史中移除 media 目录**：
```bash
git filter-branch --force --index-filter \
  "git rm -rf --cached --ignore-unmatch backend/media" \
  --prune-empty --tag-name-filter cat -- --all
```

2. **清理引用**：
```bash
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d
```

3. **清理和压缩**：
```bash
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

4. **强制推送**：
```bash
git push origin main --force
```

### 方法 3: 使用 git-filter-repo（最快，需要安装）

1. **安装 git-filter-repo**：
```bash
# Ubuntu/Debian
sudo apt install git-filter-repo

# 或使用 pip
pip install git-filter-repo
```

2. **移除 media 目录**：
```bash
git filter-repo --path backend/media --invert-paths
```

3. **强制推送**：
```bash
git push origin main --force
```

## 重要提示

⚠️ **警告**：
- 强制推送会重写远程仓库历史
- 如果其他人也在使用这个仓库，他们需要重新克隆
- 建议在操作前备份远程仓库

## 预防措施

✅ 已更新 `.gitignore` 文件，现在会忽略：
- `backend/media/` - 所有媒体文件
- `*.pdf`, `*.jpg`, `*.png` 等 - 所有媒体文件类型

## 如果遇到问题

如果清理后仍然无法推送，可能需要：
1. 检查是否还有其他大文件：`git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | awk '/^blob/ {print substr($0,6)}' | sort --numeric-sort --key=2 | tail -10`
2. 考虑使用 Git LFS（Large File Storage）来管理大文件

