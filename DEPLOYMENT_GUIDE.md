# 生产环境部署指南

本文档将指导您如何将项目部署到生产环境。

## 目录

1. [准备工作](#准备工作)
2. [服务器环境配置](#服务器环境配置)
3. [项目部署步骤](#项目部署步骤)
4. [Nginx 配置](#nginx-配置)
5. [Gunicorn 配置](#gunicorn-配置)
6. [数据库配置](#数据库配置)
7. [静态文件和媒体文件](#静态文件和媒体文件)
8. [SSL/HTTPS 配置](#sslhttps-配置)
9. [监控和维护](#监控和维护)
10. [常见问题](#常见问题)

---

## 准备工作

### 1. 检查项目依赖

确保 `requirements.txt` 包含所有必要的依赖：

```bash
cd /path/to/sw_project
cat requirements.txt
```

如果缺少 `python-dotenv`，请添加：

```bash
echo "python-dotenv>=1.0.0" >> requirements.txt
```

### 2. 准备环境变量文件

在项目根目录创建 `.env` 文件（基于 `.env.example`）：

```bash
cp .env.example .env
```

编辑 `.env` 文件，设置生产环境配置（见下方详细说明）。

---

## 服务器环境配置

### 1. 系统要求

- **操作系统**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **Python**: 3.9+
- **数据库**: MySQL 5.7+ / MariaDB 10.3+
- **Web 服务器**: Nginx
- **应用服务器**: Gunicorn

### 2. 安装系统依赖

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 安装 Python 和 pip
sudo apt install python3 python3-pip python3-venv -y

# 安装 MySQL
sudo apt install mysql-server -y

# 安装 Nginx
sudo apt install nginx -y

# 安装其他工具
sudo apt install git curl build-essential -y
```

### 3. 安装 Node.js (用于前端构建)

```bash
# 使用 NodeSource 安装 Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node --version
npm --version
```

---

## 项目部署步骤

### 1. 克隆或上传项目

```bash
# 如果使用 Git
cd /var/www
sudo git clone <your-repo-url> sw_project
cd sw_project

# 或者直接上传项目文件到服务器
```

### 2. 创建虚拟环境

```bash
cd /var/www/sw_project
python3 -m venv venv
source venv/bin/activate
```

### 3. 安装 Python 依赖

```bash
pip install --upgrade pip

# 如果项目根目录有 requirements.txt，使用：
pip install -r requirements.txt

# 或者如果 backend 目录有独立的 requirements.txt，使用：
pip install -r backend/requirements.txt

# 确保安装了 python-dotenv
pip install python-dotenv>=1.0.0
```

### 4. 配置环境变量

编辑 `.env` 文件：

```bash
nano .env
```

**生产环境必须配置的变量：**

```env
# 环境设置
DJANGO_ENV=production
DEBUG=False

# 安全配置
SECRET_KEY=<生成一个强随机密钥，见下方说明>
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# 数据库配置
DB_ENGINE=django.db.backends.mysql
DB_NAME=shuwei_prod
DB_USER=shuwei_user
DB_PASSWORD=<强密码>
DB_HOST=localhost
DB_PORT=3306

# 生产环境安全设置
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
```

**生成 SECRET_KEY：**

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 5. 配置数据库

```bash
# 登录 MySQL
sudo mysql -u root -p

# 在 MySQL 中执行
CREATE DATABASE shuwei_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'shuwei_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON shuwei_prod.* TO 'shuwei_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 6. 运行数据库迁移

```bash
cd /var/www/sw_project/backend
python manage.py migrate
```

### 7. 创建超级用户

```bash
python manage.py createsuperuser
```

### 8. 收集静态文件

```bash
python manage.py collectstatic --noinput
```

### 9. 构建前端

```bash
cd /var/www/sw_project/frontend
npm install
npm run build
```

---

## Nginx 配置

### 1. 创建 Nginx 配置文件

```bash
sudo nano /etc/nginx/sites-available/sw_project
```

### 2. Nginx 配置内容

```nginx
# 上游服务器 (Gunicorn)
upstream django {
    server unix:/var/www/sw_project/gunicorn.sock fail_timeout=0;
}

# HTTP 服务器 (重定向到 HTTPS)
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # 如果使用 Let's Encrypt，取消注释以下行
    # location /.well-known/acme-challenge/ {
    #     root /var/www/certbot;
    # }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS 服务器
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL 证书配置 (使用 Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # 日志
    access_log /var/log/nginx/sw_project_access.log;
    error_log /var/log/nginx/sw_project_error.log;
    
    # 客户端最大上传大小
    client_max_body_size 100M;
    
    # 静态文件
    location /static/ {
        alias /var/www/sw_project/backend/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # 媒体文件
    location /media/ {
        alias /var/www/sw_project/backend/media/;
        expires 7d;
        add_header Cache-Control "public";
    }
    
    # 前端静态文件 (如果前端构建后放在这里)
    location / {
        root /var/www/sw_project/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Django API 代理
    location /api/ {
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $http_host;
        proxy_redirect off;
        proxy_pass http://django;
    }
    
    # Django Admin
    location /admin/ {
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $http_host;
        proxy_redirect off;
        proxy_pass http://django;
    }
}

# 如果暂时不使用 HTTPS，可以使用以下简化配置
# server {
#     listen 80;
#     server_name yourdomain.com www.yourdomain.com;
#     
#     client_max_body_size 100M;
#     
#     location /static/ {
#         alias /var/www/sw_project/backend/staticfiles/;
#     }
#     
#     location /media/ {
#         alias /var/www/sw_project/backend/media/;
#     }
#     
#     location / {
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#         proxy_set_header Host $http_host;
#         proxy_redirect off;
#         proxy_pass http://django;
#     }
# }
```

### 3. 启用站点

```bash
sudo ln -s /etc/nginx/sites-available/sw_project /etc/nginx/sites-enabled/
sudo nginx -t  # 测试配置
sudo systemctl reload nginx
```

---

## Gunicorn 配置

### 1. 安装 Gunicorn

```bash
source /var/www/sw_project/venv/bin/activate
pip install gunicorn
```

### 2. 创建 Gunicorn 配置文件

```bash
nano /var/www/sw_project/gunicorn_config.py
```

内容：

```python
# Gunicorn 配置文件
import multiprocessing

# 服务器套接字
bind = "unix:/var/www/sw_project/gunicorn.sock"
backlog = 2048

# 工作进程
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2

# 日志
accesslog = "/var/www/sw_project/logs/gunicorn_access.log"
errorlog = "/var/www/sw_project/logs/gunicorn_error.log"
loglevel = "info"

# 进程命名
proc_name = "sw_project"

# 服务器机制
daemon = False
pidfile = "/var/www/sw_project/gunicorn.pid"
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL (如果需要)
# keyfile = None
# certfile = None
```

### 3. 创建 Systemd 服务文件

```bash
sudo nano /etc/systemd/system/sw_project.service
```

内容：

```ini
[Unit]
Description=sw_project Gunicorn daemon
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/sw_project/backend
Environment="PATH=/var/www/sw_project/venv/bin"
ExecStart=/var/www/sw_project/venv/bin/gunicorn \
    --config /var/www/sw_project/gunicorn_config.py \
    shuwei.wsgi:application

Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

### 4. 启动服务

```bash
# 创建日志目录
sudo mkdir -p /var/www/sw_project/logs
sudo chown -R www-data:www-data /var/www/sw_project

# 启动服务
sudo systemctl daemon-reload
sudo systemctl start sw_project
sudo systemctl enable sw_project

# 检查状态
sudo systemctl status sw_project
```

---

## 数据库配置

### 1. 优化 MySQL 配置 (可选)

编辑 MySQL 配置：

```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

添加或修改：

```ini
[mysqld]
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
max_connections = 200
innodb_buffer_pool_size = 1G
```

重启 MySQL：

```bash
sudo systemctl restart mysql
```

### 2. 数据库备份

创建备份脚本：

```bash
nano /var/www/sw_project/backup_db.sh
```

内容：

```bash
#!/bin/bash
BACKUP_DIR="/var/www/sw_project/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="shuwei_prod"
DB_USER="shuwei_user"
DB_PASS="your_password"

mkdir -p $BACKUP_DIR
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# 删除 7 天前的备份
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete
```

设置权限：

```bash
chmod +x /var/www/sw_project/backup_db.sh
```

添加到 crontab (每天凌晨 2 点备份)：

```bash
crontab -e
# 添加以下行
0 2 * * * /var/www/sw_project/backup_db.sh
```

---

## 静态文件和媒体文件

### 1. 设置权限

```bash
sudo chown -R www-data:www-data /var/www/sw_project/backend/staticfiles
sudo chown -R www-data:www-data /var/www/sw_project/backend/media
sudo chmod -R 755 /var/www/sw_project/backend/staticfiles
sudo chmod -R 755 /var/www/sw_project/backend/media
```

### 2. 定期收集静态文件

如果静态文件有更新，运行：

```bash
cd /var/www/sw_project/backend
source /var/www/sw_project/venv/bin/activate
python manage.py collectstatic --noinput
```

---

## SSL/HTTPS 配置

### 使用 Let's Encrypt (免费 SSL 证书)

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书 (确保域名已解析到服务器)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 自动续期测试
sudo certbot renew --dry-run
```

证书会自动续期，无需手动操作。

---

## 监控和维护

### 1. 查看日志

```bash
# Gunicorn 日志
tail -f /var/www/sw_project/logs/gunicorn_error.log

# Nginx 日志
tail -f /var/log/nginx/sw_project_error.log

# Django 日志
tail -f /var/www/sw_project/backend/logs/django.log
```

### 2. 重启服务

```bash
# 重启 Gunicorn
sudo systemctl restart sw_project

# 重启 Nginx
sudo systemctl restart nginx

# 重启 MySQL
sudo systemctl restart mysql
```

### 3. 更新代码

```bash
cd /var/www/sw_project
source venv/bin/activate

# 拉取最新代码 (如果使用 Git)
git pull

# 安装新依赖
pip install -r requirements.txt

# 运行迁移
cd backend
python manage.py migrate

# 收集静态文件
python manage.py collectstatic --noinput

# 重启服务
sudo systemctl restart sw_project
```

---

## 常见问题

### 1. 502 Bad Gateway

- 检查 Gunicorn 是否运行：`sudo systemctl status sw_project`
- 检查 socket 文件权限：`ls -l /var/www/sw_project/gunicorn.sock`
- 查看 Gunicorn 错误日志：`tail -f /var/www/sw_project/logs/gunicorn_error.log`

### 2. 静态文件 404

- 确认已运行 `collectstatic`
- 检查 Nginx 配置中的路径是否正确
- 检查文件权限

### 3. 数据库连接错误

- 检查 `.env` 文件中的数据库配置
- 确认 MySQL 服务运行：`sudo systemctl status mysql`
- 检查数据库用户权限

### 4. 权限问题

```bash
# 修复项目目录权限
sudo chown -R www-data:www-data /var/www/sw_project
sudo chmod -R 755 /var/www/sw_project
```

### 5. 内存不足

如果服务器内存较小，可以减少 Gunicorn workers：

编辑 `gunicorn_config.py`：

```python
workers = 2  # 减少工作进程数
```

---

## 快速检查清单

部署完成后，请检查：

- [ ] 网站可以正常访问
- [ ] HTTPS 正常工作 (如果配置了)
- [ ] 静态文件正常加载
- [ ] 媒体文件可以上传和访问
- [ ] 数据库连接正常
- [ ] Admin 后台可以登录
- [ ] API 接口正常工作
- [ ] 日志文件正常生成
- [ ] 服务自动启动 (重启服务器后)

---

## 安全建议

1. **定期更新系统**：`sudo apt update && sudo apt upgrade`
2. **使用强密码**：数据库、Django 管理员等
3. **配置防火墙**：只开放必要端口 (80, 443, 22)
4. **定期备份**：数据库和媒体文件
5. **监控日志**：及时发现异常
6. **使用 HTTPS**：保护数据传输安全
7. **限制 SSH 访问**：使用密钥认证，禁用密码登录

---

## 联系支持

如果遇到问题，请检查：
1. 日志文件
2. 服务状态
3. 配置文件语法
4. 文件权限

祝部署顺利！

