# 生产环境部署文档

本文档详细说明如何将项目部署到生产环境，使用 Nginx 作为反向代理服务器。

## 📋 目录

1. [部署前检查清单](#部署前检查清单)
2. [服务器环境准备](#服务器环境准备)
3. [后端部署](#后端部署)
4. [前端部署](#前端部署)
5. [Nginx 配置](#nginx-配置)
6. [域名配置](#域名配置)
7. [前后端连接配置](#前后端连接配置)
8. [SSL/HTTPS 配置](#sslhttps-配置)
9. [服务管理](#服务管理)
10. [故障排查](#故障排查)

---

## 部署前检查清单

### ✅ 后端检查项

- [x] **Django 项目结构完整**
  - ✅ `wsgi.py` 文件存在（用于 Gunicorn/uWSGI）
  - ✅ `settings.py` 支持环境变量配置
  - ✅ 支持生产环境配置（`DJANGO_ENV=production`）

- [x] **依赖管理**
  - ✅ `requirements.txt` 文件存在
  - ✅ 包含所有必要的依赖包

- [x] **数据库配置**
  - ✅ 数据库配置支持从环境变量读取
  - ✅ 生产环境数据库已准备就绪

- [x] **静态文件和媒体文件**
  - ✅ `STATIC_ROOT` 配置正确
  - ✅ `MEDIA_ROOT` 配置正确

- [x] **安全配置**
  - ✅ `SECRET_KEY` 可以从环境变量读取
  - ✅ `ALLOWED_HOSTS` 支持生产环境配置
  - ✅ `CSRF_TRUSTED_ORIGINS` 支持生产环境配置

### ✅ 前端检查项

- [x] **构建配置**
  - ✅ `package.json` 包含 `build` 脚本
  - ✅ `vite.config.ts` 配置正确
  - ✅ 构建输出目录为 `dist`

- [x] **API 连接配置**
  - ✅ `apiClient.ts` 支持环境变量 `VITE_API_BASE_URL`
  - ✅ 默认使用相对路径 `/api`（适合生产环境）

**结论：前后端都可以发布到生产环境！** ✅

---

## 服务器环境准备

### 1. 系统要求

- Ubuntu 20.04+ / Debian 11+ / CentOS 8+（推荐 Ubuntu 24.04）
- 至少 2GB RAM
- 至少 10GB 可用磁盘空间
- 已配置域名（可选，但推荐）

### 2. 安装必要软件

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Python 3.12 和 pip
sudo apt install -y python3.12 python3.12-venv python3-pip

# 安装 Node.js 18+ 和 npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 Nginx
sudo apt install -y nginx

# 安装 MySQL（如果还没有安装）
sudo apt install -y mysql-server

# 安装 Gunicorn（用于运行 Django）
pip3 install gunicorn

# 安装 Supervisor（用于进程管理，可选但推荐）
sudo apt install -y supervisor
```

### 3. 创建项目目录

```bash
# 创建项目目录（假设部署在 /var/www/sw_project）
sudo mkdir -p /var/www/sw_project
sudo chown $USER:$USER /var/www/sw_project

# 或者使用您现有的项目目录
# 确保目录有适当的权限
```

---

## 后端部署

### 步骤 1: 上传代码到服务器

```bash
# 在本地项目目录
cd /path/to/sw_project

# 使用 rsync 或 scp 上传代码（排除 node_modules, venv 等）
rsync -avz --exclude 'node_modules' \
           --exclude 'venv' \
           --exclude '__pycache__' \
           --exclude '*.pyc' \
           --exclude '.git' \
           --exclude 'frontend/dist' \
           ./ user@your-server:/var/www/sw_project/
```

### 步骤 2: 创建 Python 虚拟环境

```bash
# 在服务器上
cd /var/www/sw_project
python3.12 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt
pip install gunicorn  # 如果还没有安装
```

### 步骤 3: 配置环境变量

```bash
# 在项目根目录创建 .env 文件
cd /var/www/sw_project
nano .env
```

**生产环境 .env 配置示例：**

```env
# =========================================
# Django 环境配置
# =========================================
DJANGO_ENV=production

# =========================================
# 安全配置
# =========================================
# 生成新的 SECRET_KEY（重要！）
# 运行: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
SECRET_KEY=your-generated-secret-key-here

# 调试模式（生产环境必须为 False）
DEBUG=False

# 允许的主机（替换为您的域名）
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# CSRF 信任的源（替换为您的域名，使用 https）
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# =========================================
# 数据库配置
# =========================================
DB_ENGINE=django.db.backends.mysql
DB_NAME=shuwei
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=3306

# =========================================
# 生产环境安全配置
# =========================================
# 强制 HTTPS 重定向（如果使用 HTTPS）
SECURE_SSL_REDIRECT=True

# HSTS 设置（秒）
SECURE_HSTS_SECONDS=31536000
```

**重要提示：**
- 必须生成新的 `SECRET_KEY`，不要使用开发环境的密钥
- `ALLOWED_HOSTS` 必须包含您的域名
- `CSRF_TRUSTED_ORIGINS` 必须使用 `https://` 协议（如果使用 HTTPS）

### 步骤 4: 配置数据库

```bash
# 登录 MySQL
sudo mysql -u root -p

# 创建数据库和用户
CREATE DATABASE shuwei CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'your_db_user'@'localhost' IDENTIFIED BY 'your_db_password';
GRANT ALL PRIVILEGES ON shuwei.* TO 'your_db_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 步骤 5: 运行数据库迁移

```bash
cd /var/www/sw_project
source venv/bin/activate
cd backend
python manage.py migrate
python manage.py collectstatic --noinput
```

### 步骤 6: 创建超级用户（如果需要）

```bash
python manage.py createsuperuser
```

### 步骤 7: 测试 Django 应用

```bash
# 测试 Django 是否能正常运行
python manage.py check --deploy

# 使用 Gunicorn 测试（在后台运行）
gunicorn shuwei.wsgi:application --bind 127.0.0.1:8000 --workers 3
```

如果测试成功，按 `Ctrl+C` 停止 Gunicorn。

---

## 前端部署

### 步骤 1: 安装依赖并构建

```bash
# 在服务器上
cd /var/www/sw_project/frontend

# 安装依赖
npm install

# 创建生产环境的环境变量文件
nano .env.production
```

**`.env.production` 内容：**

```env
# 生产环境 API 基础 URL
# 如果前后端在同一域名下，使用相对路径
VITE_API_BASE_URL=/api

# 或者如果后端在不同域名/端口，使用完整 URL
# VITE_API_BASE_URL=https://api.yourdomain.com
```

**构建前端：**

```bash
# 构建生产版本
npm run build

# 构建完成后，dist 目录包含所有静态文件
ls -la dist/
```

### 步骤 2: 验证构建结果

```bash
# 检查构建输出
cd dist
ls -la

# 应该看到 index.html 和 assets 目录
```

---

## Nginx 配置

### 步骤 1: 创建 Nginx 配置文件

```bash
sudo nano /etc/nginx/sites-available/sw_project
```

### 步骤 2: 完整 Nginx 配置

**重要说明：**
- 将 `yourdomain.com` 替换为您的实际域名
- 前端静态文件由 Nginx 直接提供
- 后端 API 请求通过 Nginx 代理到 Gunicorn（运行在 127.0.0.1:8000）
- 静态文件和媒体文件也由 Nginx 提供

```nginx
# 上游服务器配置（Django/Gunicorn）
upstream django {
    server 127.0.0.1:8000;
}

# HTTP 服务器配置（重定向到 HTTPS）
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # 如果使用 HTTPS，重定向所有 HTTP 请求到 HTTPS
    # return 301 https://$server_name$request_uri;
    
    # 如果暂时不使用 HTTPS，注释掉上面的 return，使用下面的配置
    # 但强烈建议使用 HTTPS！
    
    # 暂时不使用 HTTPS 的配置（不推荐）
    # 请参考下面的 HTTPS 配置部分
}

# HTTPS 服务器配置（推荐）
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL 证书配置（使用 Let's Encrypt）
    # 证书路径需要根据实际情况修改
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL 配置（安全最佳实践）
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 日志配置
    access_log /var/log/nginx/sw_project_access.log;
    error_log /var/log/nginx/sw_project_error.log;

    # 客户端最大上传大小（用于文件上传）
    client_max_body_size 100M;

    # 前端静态文件根目录
    root /var/www/sw_project/frontend/dist;
    index index.html;

    # 前端静态资源（CSS, JS, 图片等）
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # 前端路由（React Router）
    # 所有前端路由都返回 index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api/ {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 评论 API 代理
    location /comment/ {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    # 互动 API 代理
    location /interactions/ {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    # Django Admin 代理
    location /admin/ {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    # Django 静态文件（admin, ckeditor 等）
    location /static/ {
        alias /var/www/sw_project/backend/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Django 媒体文件（用户上传的文件）
    location /media/ {
        alias /var/www/sw_project/backend/media/;
        expires 1y;
        add_header Cache-Control "public";
    }

    # CKEditor 上传接口
    location /ckeditor5/ {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
        
        # 文件上传需要更大的超时时间
        client_max_body_size 100M;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

### 步骤 3: 启用站点配置

```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/sw_project /etc/nginx/sites-enabled/

# 测试 Nginx 配置
sudo nginx -t

# 如果测试通过，重载 Nginx
sudo systemctl reload nginx
```

---

## 域名配置

### 步骤 1: DNS 配置

在您的域名注册商处配置 DNS 记录：

**A 记录：**
```
yourdomain.com      A     您的服务器IP地址
www.yourdomain.com  A     您的服务器IP地址
```

**或者使用 CNAME：**
```
www.yourdomain.com  CNAME  yourdomain.com
```

### 步骤 2: 验证 DNS 解析

```bash
# 检查 DNS 解析
nslookup yourdomain.com
dig yourdomain.com
```

---

## 前后端连接配置

### 关键配置点说明

1. **前端 API 请求路径**
   - 前端使用相对路径 `/api`（在 `.env.production` 中配置）
   - 所有 `/api/*` 请求会被 Nginx 代理到后端 Django

2. **后端 CORS/CSRF 配置**
   - `ALLOWED_HOSTS` 必须包含您的域名
   - `CSRF_TRUSTED_ORIGINS` 必须包含 `https://yourdomain.com`

3. **Nginx 代理配置**
   - `/api/` → `http://127.0.0.1:8000/api/`
   - `/comment/` → `http://127.0.0.1:8000/comment/`
   - `/interactions/` → `http://127.0.0.1:8000/interactions/`
   - `/admin/` → `http://127.0.0.1:8000/admin/`
   - `/static/` → Django 静态文件目录
   - `/media/` → Django 媒体文件目录

### 连接流程图

```
用户浏览器
    ↓
HTTPS 请求 (https://yourdomain.com)
    ↓
Nginx (443端口)
    ↓
    ├─→ /api/* → 代理到 → Gunicorn (127.0.0.1:8000)
    ├─→ /comment/* → 代理到 → Gunicorn
    ├─→ /interactions/* → 代理到 → Gunicorn
    ├─→ /admin/* → 代理到 → Gunicorn
    ├─→ /static/* → 直接提供静态文件
    ├─→ /media/* → 直接提供媒体文件
    └─→ /* → 前端 React 应用 (index.html)
```

---

## SSL/HTTPS 配置

### 使用 Let's Encrypt 免费 SSL 证书

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取 SSL 证书（自动配置 Nginx）
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 测试自动续期
sudo certbot renew --dry-run
```

**Certbot 会自动：**
- 获取 SSL 证书
- 配置 Nginx SSL 设置
- 设置自动续期

### 手动配置 SSL（如果已有证书）

如果您已有 SSL 证书，修改 Nginx 配置中的证书路径：

```nginx
ssl_certificate /path/to/your/certificate.crt;
ssl_certificate_key /path/to/your/private.key;
```

---

## 服务管理

### 使用 Supervisor 管理 Gunicorn

**创建 Supervisor 配置文件：**

```bash
sudo nano /etc/supervisor/conf.d/sw_project.conf
```

**配置内容：**

```ini
[program:sw_project]
command=/var/www/sw_project/venv/bin/gunicorn shuwei.wsgi:application --bind 127.0.0.1:8000 --workers 3 --timeout 120
directory=/var/www/sw_project/backend
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/supervisor/sw_project.log
environment=PATH="/var/www/sw_project/venv/bin"
```

**启动服务：**

```bash
# 重新加载 Supervisor 配置
sudo supervisorctl reread
sudo supervisorctl update

# 启动服务
sudo supervisorctl start sw_project

# 查看状态
sudo supervisorctl status sw_project

# 查看日志
sudo tail -f /var/log/supervisor/sw_project.log
```

### 使用 systemd（替代方案）

**创建 systemd 服务文件：**

```bash
sudo nano /etc/systemd/system/sw_project.service
```

**配置内容：**

```ini
[Unit]
Description=SW Project Gunicorn daemon
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/sw_project/backend
Environment="PATH=/var/www/sw_project/venv/bin"
ExecStart=/var/www/sw_project/venv/bin/gunicorn shuwei.wsgi:application --bind 127.0.0.1:8000 --workers 3 --timeout 120

[Install]
WantedBy=multi-user.target
```

**启动服务：**

```bash
# 重新加载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start sw_project

# 设置开机自启
sudo systemctl enable sw_project

# 查看状态
sudo systemctl status sw_project
```

---

## 故障排查

### 1. 检查服务状态

```bash
# 检查 Nginx
sudo systemctl status nginx
sudo nginx -t

# 检查 Gunicorn
sudo supervisorctl status sw_project
# 或
sudo systemctl status sw_project

# 检查端口占用
sudo netstat -tlnp | grep 8000
sudo netstat -tlnp | grep 80
sudo netstat -tlnp | grep 443
```

### 2. 查看日志

```bash
# Nginx 日志
sudo tail -f /var/log/nginx/sw_project_access.log
sudo tail -f /var/log/nginx/sw_project_error.log

# Django 日志
sudo tail -f /var/www/sw_project/backend/logs/django.log

# Gunicorn 日志（Supervisor）
sudo tail -f /var/log/supervisor/sw_project.log
```

### 3. 常见问题

**问题 1: 502 Bad Gateway**
- 检查 Gunicorn 是否运行：`sudo supervisorctl status sw_project`
- 检查端口 8000 是否被占用
- 检查 Nginx 配置中的 `proxy_pass` 地址是否正确

**问题 2: 403 Forbidden**
- 检查文件权限：`sudo chown -R www-data:www-data /var/www/sw_project`
- 检查目录权限：`sudo chmod -R 755 /var/www/sw_project`

**问题 3: 静态文件 404**
- 确认已运行 `python manage.py collectstatic`
- 检查 `STATIC_ROOT` 路径是否正确
- 检查 Nginx 配置中的 `alias` 路径

**问题 4: CSRF 错误**
- 检查 `CSRF_TRUSTED_ORIGINS` 是否包含您的域名
- 确认使用 HTTPS（如果配置了）
- 检查 Cookie 设置

**问题 5: 数据库连接错误**
- 检查数据库服务是否运行：`sudo systemctl status mysql`
- 检查 `.env` 文件中的数据库配置
- 测试数据库连接：`mysql -u your_db_user -p`

### 4. 测试 API 连接

```bash
# 测试后端 API（在服务器上）
curl http://127.0.0.1:8000/api/qa/

# 测试前端（通过域名）
curl https://yourdomain.com

# 测试 API（通过域名）
curl https://yourdomain.com/api/qa/
```

---

## 部署检查清单

部署完成后，请检查以下项目：

- [ ] 前端页面可以正常访问
- [ ] 后端 API 可以正常访问（`/api/qa/` 等）
- [ ] 静态文件可以正常加载（CSS, JS, 图片）
- [ ] 媒体文件可以正常访问（`/media/`）
- [ ] Django Admin 可以正常访问（`/admin/`）
- [ ] 评论功能正常
- [ ] 文件上传功能正常
- [ ] HTTPS 正常工作（如果配置了）
- [ ] 日志文件正常生成
- [ ] 服务可以自动重启（测试重启服务器）

---

## 更新部署

当需要更新代码时：

```bash
# 1. 拉取最新代码
cd /var/www/sw_project
git pull  # 或使用其他方式更新代码

# 2. 更新后端
source venv/bin/activate
cd backend
pip install -r ../requirements.txt  # 如果有新依赖
python manage.py migrate  # 如果有数据库迁移
python manage.py collectstatic --noinput

# 3. 更新前端
cd ../frontend
npm install  # 如果有新依赖
npm run build

# 4. 重启服务
sudo supervisorctl restart sw_project
# 或
sudo systemctl restart sw_project

# 5. 重载 Nginx（通常不需要，但如果有配置更改）
sudo systemctl reload nginx
```

---

## 安全建议

1. **防火墙配置**
   ```bash
   # 只开放必要端口
   sudo ufw allow 22/tcp   # SSH
   sudo ufw allow 80/tcp   # HTTP
   sudo ufw allow 443/tcp  # HTTPS
   sudo ufw enable
   ```

2. **定期备份**
   - 数据库备份
   - 媒体文件备份
   - 代码备份

3. **监控和日志**
   - 设置日志轮转
   - 监控服务器资源使用
   - 设置异常告警

4. **更新系统**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

---

## 总结

完成以上步骤后，您的项目应该已经成功部署到生产环境。主要配置点：

1. ✅ 后端 Django 通过 Gunicorn 运行在 127.0.0.1:8000
2. ✅ 前端 React 应用构建后由 Nginx 直接提供
3. ✅ Nginx 作为反向代理，将 API 请求转发到后端
4. ✅ 静态文件和媒体文件由 Nginx 直接提供
5. ✅ 使用 HTTPS 保护数据传输（推荐）
6. ✅ 使用 Supervisor 或 systemd 管理服务

如有问题，请查看日志文件进行排查。

