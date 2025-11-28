# 配置 Nginx 以 django_user 运行

## ⚠️ 重要提示

**不推荐**在生产环境中这样做，原因：
1. Nginx master 进程必须以 root 运行（绑定 80/443 端口）
2. 只有 worker 进程可以以非 root 用户运行
3. 更安全的做法是修复文件权限（见方案2）

---

## 步骤1：修改 Nginx 主配置文件

```bash
sudo nano /etc/nginx/nginx.conf
```

在文件开头找到或添加 `user` 指令：

```nginx
user django_user;
worker_processes auto;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    ...
}
```

**注意**：`user` 指令必须在 `events` 块之前。

---

## 步骤2：修复相关目录权限

Nginx 需要访问以下目录，确保 django_user 有权限：

```bash
# 日志目录
sudo chown -R django_user:django_user /var/log/nginx/

# 缓存目录
sudo mkdir -p /var/cache/nginx
sudo chown -R django_user:django_user /var/cache/nginx/

# 临时文件目录
sudo mkdir -p /var/lib/nginx
sudo chown -R django_user:django_user /var/lib/nginx/

# PID 文件目录（可能需要特殊处理）
sudo chown django_user:django_user /run/nginx.pid 2>/dev/null || true
```

---

## 步骤3：测试配置

```bash
sudo nginx -t
```

如果测试通过，继续下一步。

---

## 步骤4：重启 Nginx

```bash
sudo systemctl restart nginx
```

---

## 步骤5：验证

```bash
# 检查 Nginx 进程
ps aux | grep nginx

# 应该看到：
# root      ... nginx: master process ...
# django_user ... nginx: worker process ...
```

---

## 可能遇到的问题

### 问题1：无法绑定端口

如果出现 "bind() to 0.0.0.0:80 failed (13: Permission denied)"，说明：
- Nginx master 进程必须以 root 运行
- 只有 worker 进程可以以 django_user 运行
- 这是正常的，master 进程仍然是 root

### 问题2：无法读取日志

```bash
sudo chown -R django_user:django_user /var/log/nginx/
```

### 问题3：SELinux 限制

如果启用了 SELinux，可能需要：

```bash
# 检查 SELinux 状态
getenforce

# 如果启用，设置上下文
sudo chcon -R -t httpd_log_t /var/log/nginx/
```

---

## 方案2：保持 www-data，修复文件权限（推荐）

这是**更安全和标准**的做法：

### 快速修复

```bash
# 修复 staticfiles 权限
sudo chown -R www-data:www-data /var/www/sw_project/backend/staticfiles/
sudo find /var/www/sw_project/backend/staticfiles -type d -exec chmod 755 {} \;
sudo find /var/www/sw_project/backend/staticfiles -type f -exec chmod 644 {} \;
```

### 自动化脚本

创建脚本，在 collectstatic 后自动修复权限：

```bash
cat > /var/www/sw_project/scripts/collectstatic_fix_perms.sh << 'EOF'
#!/bin/bash
cd /var/www/sw_project/backend
source ../venv/bin/activate
python manage.py collectstatic --noinput
sudo chown -R www-data:www-data /var/www/sw_project/backend/staticfiles/
sudo find /var/www/sw_project/backend/staticfiles -type d -exec chmod 755 {} \;
sudo find /var/www/sw_project/backend/staticfiles -type f -exec chmod 644 {} \;
echo "✓ 静态文件已收集并修复权限"
EOF

chmod +x /var/www/sw_project/scripts/collectstatic_fix_perms.sh
```

以后运行：
```bash
/var/www/sw_project/scripts/collectstatic_fix_perms.sh
```

---

## 方案3：以 www-data 用户运行 collectstatic

每次运行 collectstatic 时，以 www-data 用户运行：

```bash
sudo -u www-data bash -c "cd /var/www/sw_project/backend && source ../venv/bin/activate && python manage.py collectstatic --noinput"
```

或创建脚本：

```bash
cat > /var/www/sw_project/scripts/collectstatic_as_wwwdata.sh << 'EOF'
#!/bin/bash
cd /var/www/sw_project/backend
source ../venv/bin/activate
sudo -u www-data python manage.py collectstatic --noinput
EOF

chmod +x /var/www/sw_project/scripts/collectstatic_as_wwwdata.sh
```

---

## 推荐方案总结

**最佳实践**（推荐）：
1. ✅ Nginx 保持以 `www-data` 运行（默认配置，无需修改）
2. ✅ 运行 `collectstatic` 后，修复文件权限为 `www-data:www-data`
3. ✅ 使用脚本自动化这个过程

**快速修复命令**：
```bash
sudo chown -R www-data:www-data /var/www/sw_project/backend/staticfiles/
sudo find /var/www/sw_project/backend/staticfiles -type d -exec chmod 755 {} \;
sudo find /var/www/sw_project/backend/staticfiles -type f -exec chmod 644 {} \;
```

---

## 验证

修复后验证：

```bash
# 1. 检查文件所有者
ls -la /var/www/sw_project/backend/staticfiles/unfold/

# 2. 测试文件可读性
sudo -u www-data test -r /var/www/sw_project/backend/staticfiles/unfold/css/custom.css && echo "✓ 可读" || echo "✗ 不可读"

# 3. 检查 Nginx 进程（应该显示 www-data）
ps aux | grep nginx | grep -v grep
```

