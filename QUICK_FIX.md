# 快速修复指南

## 问题
Git 提示有未暂存的更改，无法运行清理脚本。

## 解决方案

### 方法 1: 使用更新后的脚本（推荐）

脚本已更新，会自动处理未暂存的更改。直接运行：

```bash
bash clean_git_history_simple.sh
```

### 方法 2: 手动处理（如果方法 1 失败）

1. **查看当前状态**：
```bash
git status
```

2. **暂存所有更改**：
```bash
git add -A
```

3. **提交更改**：
```bash
git commit -m "chore: 更新 .gitignore 并准备清理 Git 历史"
```

4. **运行清理脚本**：
```bash
bash clean_git_history_simple.sh
```

### 方法 3: 如果只想暂存 .gitignore（推荐）

如果您只想提交 .gitignore 的更改：

```bash
# 只暂存 .gitignore
git add .gitignore

# 提交
git commit -m "chore: 更新 .gitignore 忽略媒体文件"

# 运行清理脚本
bash clean_git_history_simple.sh
```

### 方法 4: 使用 git-filter-repo（最快，推荐）

如果上述方法都不行，可以使用更快的工具：

```bash
# 1. 安装 git-filter-repo
sudo apt install git-filter-repo

# 2. 先提交当前更改
git add -A
git commit -m "chore: 更新 .gitignore"

# 3. 移除 media 目录（这比 filter-branch 快得多）
git filter-repo --path backend/media --invert-paths

# 4. 强制推送
git push origin main --force
```

## 注意事项

- 如果使用 `git filter-repo`，它会自动清理引用，不需要手动执行 `git gc`
- 强制推送前，确保没有其他人在使用这个仓库
- 建议先备份远程仓库

