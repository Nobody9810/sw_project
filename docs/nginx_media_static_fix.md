# Nginx Media 和 Staticfiles 无法访问问题修复指南

## 问题描述

在生产环境中，使用 nginx 部署项目后，前端无法读取 `/media/` 和 `/static/` 下的文件，且加载速度很慢。

## 根本原因

### 1. Nginx Location 顺序问题（主要原因）

nginx 的 location 匹配有优先级规则：
1. 精确匹配 `=` 优先级最高
2. 前缀匹配（如 `/static/`）按最长匹配优先
3. 正则匹配 `~` 和 `~*` 按在配置文件中的顺序匹配，**一旦匹配就停止**
4. 通用匹配 `/` 优先级最低

**原配置的问题**：
- 正则匹配 `location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$` 在 `/static/` 和 `/media/` 之前
- 当请求 `/static/admin/css/base.css` 时，正则匹配先匹配到 `.css` 扩展名
- nginx 尝试从 `root /var/www/sw_project/frontend/dist` 查找文件
- 文件不存在，返回 404 或尝试前端路由，导致加载慢

### 2. 其他可能的问题

- 文件权限不正确
- 目录路径不存在
- SELinux 限制（如果启用）

## 解决方案

### 步骤 1：修复 Nginx 配置顺序

**关键原则**：将 `/static/` 和 `/media/` 的 location 块放在正则匹配之前。

已修复的配置顺序：
1. `/static/` - Django 静态文件
2. `/media/` - Django 媒体文件
3. `/api/` - API 代理
4. `/comment/` - 评论 API
5. `/interactions/` - 互动 API
6. `/admin/` - Django Admin
7. `/ckeditor5/` - CKEditor 上传
8. `~* \.(js|css|...)` - 前端静态资源（正则匹配）
9. `/` - 前端路由（兜底）

### 步骤 2：检查文件权限

运行诊断脚本：
```bash
sudo bash scripts/diagnose_media_static.sh
```

或手动修复权限：
```bash
# 设置 staticfiles 权限
sudo chown -R www-data:www-data /var/www/sw_project/backend/staticfiles
sudo find /var/www/sw_project/backend/staticfiles -type d -exec chmod 755 {} \;
sudo find /var/www/sw_project/backend/staticfiles -type f -exec chmod 644 {} \;

# 设置 media 权限
sudo chown -R www-data:www-data /var/www/sw_project/backend/media
sudo find /var/www/sw_project/backend/media -type d -exec chmod 755 {} \;
sudo find /var/www/sw_project/backend/media -type f -exec chmod 644 {} \;
```

### 步骤 3：验证配置并重载 Nginx

```bash
# 测试配置语法
sudo nginx -t

# 如果测试通过，重载 nginx
sudo systemctl reload nginx
```

### 步骤 4：清除浏览器缓存

清除浏览器缓存并刷新页面测试。

## 快速修复脚本

使用提供的快速修复脚本：
```bash
sudo bash scripts/fix_media_static.sh
```

这个脚本会：
1. 自动修复文件权限
2. 验证 nginx 配置
3. 重载 nginx

## 验证修复

### 1. 检查文件是否可以访问

在浏览器中直接访问：
- `https://yourdomain.com/static/admin/css/base.css`
- `https://yourdomain.com/media/your-file.jpg`

### 2. 检查 Nginx 错误日志

```bash
sudo tail -f /var/log/nginx/sw_project_error.log
```

### 3. 检查 Nginx 访问日志

```bash
sudo tail -f /var/log/nginx/sw_project_access.log
```

## 配置说明

### Nginx Location 匹配规则详解

```nginx
# 1. 前缀匹配（最长匹配优先）
location /static/ {
    alias /var/www/sw_project/backend/staticfiles/;
    # 匹配所有以 /static/ 开头的请求
}

# 2. 正则匹配（按顺序匹配，一旦匹配就停止）
location ~* \.(js|css|png|jpg)$ {
    # 匹配所有以这些扩展名结尾的文件
    # 但不会匹配已经被前缀匹配处理的请求
}

# 3. 通用匹配（兜底）
location / {
    # 匹配所有其他请求
}
```

### 为什么顺序很重要？

nginx 的匹配顺序：
1. 先检查所有前缀匹配，选择最长匹配
2. 如果前缀匹配成功，检查是否有正则匹配（按顺序）
3. 如果正则匹配成功，使用该 location
4. 否则使用前缀匹配的 location

**关键点**：正则匹配会覆盖前缀匹配，所以必须将 `/static/` 和 `/media/` 放在正则匹配之前，或者使用更精确的正则表达式排除这些路径。

## 常见问题

### Q: 为什么文件权限改了还是无法访问？

A: 可能是 nginx location 顺序问题，导致请求被错误的路由处理。先修复 location 顺序。

### Q: 为什么加载很慢？

A: 如果请求被错误路由到前端应用，前端路由会尝试处理，导致延迟。修复 location 顺序后应该会解决。

### Q: 如何确认是 location 顺序问题？

A: 检查 nginx 错误日志，如果看到 404 错误或者请求被路由到前端，就是 location 顺序问题。

## 参考

- [Nginx Location 匹配规则](http://nginx.org/en/docs/http/ngx_http_core_module.html#location)
- [Django 静态文件部署](https://docs.djangoproject.com/en/stable/howto/static-files/deployment/)

