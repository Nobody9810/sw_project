# Nginx Location 顺序修复指南

## 问题

当 `/media/` location 在正则 location `~* \.(jpg|png|...)$` 之后时，图片请求会被正则 location 捕获，导致在错误的位置查找文件。

## 正确的 Location 顺序

Nginx location 的匹配优先级：
1. 精确匹配 `=`
2. 前缀匹配（最长匹配优先）
3. 正则匹配（按配置顺序）
4. 通用匹配 `/`

**关键原则**：更具体的 location 应该放在更通用的 location 之前。

## 修复后的配置顺序

```nginx
server {
    listen 443 ssl http2;
    server_name shuwei365.com www.shuwei365.com;
    
    root /var/www/sw_project/frontend/dist;
    index index.html;

    # 1. 最具体的 location - Django 静态文件（必须在正则之前）
    location /static/ {
        alias /var/www/sw_project/backend/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 2. 最具体的 location - Django 媒体文件（必须在正则之前）
    location /media/ {
        alias /var/www/sw_project/backend/media/;
        expires 1y;
        add_header Cache-Control "public";
    }

    # 3. 后端 API 代理（具体路径）
    location /api/ {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    location /comment/ {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    location /interactions/ {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    location /admin/ {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    location /ckeditor5/ {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
        
        client_max_body_size 100M;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # 4. 前端静态资源缓存（正则匹配，必须在具体 location 之后）
    # 注意：这个不会匹配 /media/ 和 /static/ 下的文件，因为它们已经被上面的 location 处理了
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # 5. 前端路由（最通用，必须在最后）
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 为什么这样修复有效？

1. `/static/` 和 `/media/` 是前缀匹配，优先级高于正则匹配
2. 当请求 `/media/images/xxx.jpg` 时：
   - 首先匹配到 `location /media/`（前缀匹配，最长匹配）
   - 不会继续匹配正则 `~* \.(jpg)$`
3. 当请求 `/assets/image.png`（前端资源）时：
   - 不匹配 `/media/` 或 `/static/`
   - 匹配正则 `~* \.(png)$`
   - 在 `root` 目录（前端 dist）中查找

## 验证修复

修复后测试：

```bash
# 1. 测试配置
sudo nginx -t

# 2. 重载 Nginx
sudo systemctl reload nginx

# 3. 测试图片访问
curl -I https://www.shuwei365.com/media/images/shuku/xxx.jpg

# 4. 测试PDF访问
curl -I https://www.shuwei365.com/media/pdf/shuku/xxx.pdf
```

