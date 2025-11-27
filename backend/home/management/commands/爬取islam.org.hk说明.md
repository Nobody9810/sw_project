# 爬取 islam.org.hk 布哈里圣训集说明

## 网站信息

- **网站**: https://www.islam.org.hk/Bukhari_Online/bukhari_online.aspx
- **内容**: 布哈里圣训实录全集（中文版）
- **说明**: 该网站提供布哈里圣训集的在线阅读

## 使用方法

### 方法1: 使用专门的爬虫命令（推荐）

我已经创建了专门针对这个网站的爬虫命令：

```bash
cd backend
python manage.py crawl_islam_org_hk --collection "布哈里圣训集"
```

**试运行（推荐先测试）**：
```bash
python manage.py crawl_islam_org_hk --collection "布哈里圣训集" --dry-run
```

**自定义参数**：
```bash
python manage.py crawl_islam_org_hk \
  --collection "布哈里圣训集" \
  --delay 2 \
  --url "https://www.islam.org.hk/Bukhari_Online/bukhari_online.aspx"
```

### 方法2: 使用通用爬虫命令

```bash
python manage.py crawl_hadith \
  --source islamhouse \
  --url "https://www.islam.org.hk/Bukhari_Online/bukhari_online.aspx" \
  --collection "布哈里圣训集"
```

## 参数说明

- `--collection`: 圣训集名称（默认"布哈里圣训集"）
- `--dry-run`: 试运行模式，不保存数据
- `--delay`: 请求间隔（秒），默认1.5秒
- `--url`: 目标页面URL（默认已设置）

## 爬取过程

1. **获取主页面**: 访问目录页面，查找所有章节链接
2. **识别章节**: 自动识别章节链接（表格、列表等）
3. **爬取内容**: 逐个访问章节页面，提取内容
4. **保存数据**: 保存到数据库

## 注意事项

1. **请求频率**: 默认1.5秒延迟，避免对服务器造成压力
2. **网络稳定**: 确保网络连接稳定，爬取可能需要较长时间
3. **数据检查**: 爬取完成后，建议在Django Admin中检查数据

## 如果遇到问题

### 问题1: 未找到章节链接

**可能原因**:
- 网站结构发生变化
- 需要登录才能访问
- 页面加载需要JavaScript

**解决方法**:
1. 检查网站是否可以正常访问
2. 查看生成的调试HTML文件
3. 手动检查页面结构

### 问题2: 某些章节内容为空

**可能原因**:
- 章节页面结构不同
- 内容需要特殊权限
- 网络请求失败

**解决方法**:
1. 检查章节URL是否可访问
2. 查看错误信息
3. 手动访问章节页面确认

### 问题3: 爬取速度慢

**原因**: 为了避免对服务器造成压力，设置了延迟

**解决方法**:
- 这是正常的，大文件需要时间
- 可以适当减少 `--delay` 参数，但不建议低于1秒

## 数据验证

爬取完成后：

1. **检查章节数量**: 在Django Admin中查看章节数量是否合理
2. **检查内容**: 随机抽查几个章节，确认内容完整
3. **检查格式**: 确认文本格式是否正确

## 下一步

爬取完成后：
1. 在Django Admin中检查数据
2. 开发前端展示页面
3. 实现搜索功能
4. 添加阅读进度等功能

