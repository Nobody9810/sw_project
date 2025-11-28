# 配置 Nginx 以 django_user 运行

## ⚠️ 安全提示

**不推荐**在生产环境中让 Nginx 以非特权用户运行，因为：
1. Nginx 需要绑定 80/443 端口，需要 root 权限
2. 以非 root 用户运行可能导致功能受限
3. 更安全的做法是保持 Nginx 以 www-data 运行，修复文件权限

**推荐方案**：保持 Nginx 以 www-data 运行，修复 staticfiles 权限（见下文）

---

## 方案1：修改 Nginx 用户（不推荐，但可行）

### 步骤1：修改 Nginx 主配置文件

```bash
sudo nano /etc/nginx/nginx.conf
```

找到或添加 `user` 指令：

```nginx
user django_user;
worker_processes auto;
pid /run/nginx.pid;
...
```

### 步骤2：确保 django_user 有必要的权限

```bash
# 确保 django_user 可以读取日志目录
sudo chown -R django_user:django_user /var/log/nginx/

# 确保 django_user 可以访问必要的目录
sudo chown -R django_user:django_user /var/cache/nginx/
sudo chown -R django_user:django_user /var/lib/nginx/
```

### 步骤3：测试配置

```bash
sudo nginx -t
```

### 步骤4：重启 Nginx

```bash
sudo systemctl restart nginx
```

### 步骤5：验证

```bash
# 检查 Nginx 进程
ps aux | grep nginx

# 应该显示 master 进程是 root，worker 进程是 django_user
```

---

## 方案2：保持 www-data，修复文件权限（推荐）

这是**更安全和标准**的做法：

### 步骤1：修复 staticfiles 权限

```bash
sudo chown -R www-data:www-data /var/www/sw_project/backend/staticfiles/
sudo find /var/www/sw_project/backend/staticfiles -type d -exec chmod 755 {} \;
sudo find /var/www/sw_project/backend/staticfiles -type f -exec chmod 644 {} \;
```

### 步骤2：修复 media 权限（如果需要）

```bash
sudo chown -R www-data:www-data /var/www/sw_project/backend/media/
sudo find /var/www/sw_project/backend/media -type d -exec chmod 755 {} \;
sudo find /var/www/sw_project/backend/media -type f -exec chmod 644 {} \;
```

### 步骤3：设置未来 collectstatic 的权限

创建一个脚本，在 collectstatic 后自动修复权限：

```bash
# 创建脚本
cat > /var/www/sw_project/scripts/collectstatic_with_permissions.sh << 'EOF'
#!/bin/bash
cd /var/www/sw_project/backend
source ../venv/bin/activate
python manage.py collectstatic --noinput
sudo chown -R www-data:www-data /var/www/sw_project/backend/staticfiles/
sudo find /var/www/sw_project/backend/staticfiles -type d -exec chmod 755 {} \;
sudo find /var/www/sw_project/backend/staticfiles -type f -exec chmod 644 {} \;
EOF

chmod +x /var/www/sw_project/scripts/collectstatic_with_permissions.sh
```

以后运行：
```bash
/var/www/sw_project/scripts/collectstatic_with_permissions.sh
```

---

## 方案3：使用 ACL（访问控制列表）

允许 www-data 读取 django_user 的文件，而不改变所有者：

```bash
# 安装 ACL 工具（如果未安装）
sudo apt-get install acl

# 为 www-data 添加读取权限
sudo setfacl -R -m u:www-data:rx /var/www/sw_project/backend/staticfiles/
sudo setfacl -R -m u:www-data:r /var/www/sw_project/backend/staticfiles/
```

---

## 方案4：修改 collectstatic 以 www-data 用户运行

每次运行 collectstatic 时，以 www-data 用户运行：

```bash
sudo -u www-data bash -c "cd /var/www/sw_project/backend && source ../venv/bin/activate && python manage.py collectstatic --noinput"
```

或者创建一个脚本：

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

## 推荐配置总结

**最佳实践**：
1. Nginx 保持以 `www-data` 运行（默认配置）
2. 运行 `collectstatic` 后，修复文件权限为 `www-data:www-data`
3. 使用脚本自动化这个过程

**快速修复命令**：
```bash
sudo chown -R www-data:www-data /var/www/sw_project/backend/staticfiles/
sudo find /var/www/sw_project/backend/staticfiles -type d -exec chmod 755 {} \;
sudo find /var/www/sw_project/backend/staticfiles -type f -exec chmod 644 {} \;
```

---

## 验证配置

修复后验证：

```bash
# 1. 检查文件所有者
ls -la /var/www/sw_project/backend/staticfiles/unfold/

# 2. 测试文件可读性
sudo -u www-data test -r /var/www/sw_project/backend/staticfiles/unfold/css/custom.css && echo "✓ 可读" || echo "✗ 不可读"

# 3. 检查 Nginx 进程
ps aux | grep nginx | grep -v grep
```

