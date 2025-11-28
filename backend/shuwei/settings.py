"""
Django settings for shuwei project.
主要包含以下配置部分:
- 基础配置 (路径、调试、安全等)
- 应用配置
- 数据库配置
- 静态文件和媒体文件配置
- 模板配置
- 国际化配置
- CKEditor配置
- 评论系统配置
- 认证和安全配置

支持从 .env 文件读取配置，适用于开发和生产环境
"""

import os
from pathlib import Path
from django.contrib.messages import constants as messages
from dotenv import load_dotenv

# =========================================
# 加载环境变量
# =========================================
# 从项目根目录加载 .env 文件
BASE_DIR = Path(__file__).resolve().parent.parent
env_path = BASE_DIR.parent / '.env'
load_dotenv(env_path)

# 判断运行环境：development 或 production
# 默认是开发环境，生产环境需要设置 DJANGO_ENV=production
ENVIRONMENT = os.getenv('DJANGO_ENV', 'development').lower()
IS_PRODUCTION = ENVIRONMENT == 'production'
IS_DEVELOPMENT = not IS_PRODUCTION

# =========================================
# 基础配置
# =========================================
TEMPLATE_DIR = os.path.join(BASE_DIR, 'templates')

# 安全配置 - 从环境变量读取，生产环境必须设置
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-102a$v)!_9vtve+1y)(ojiwf23j&nm2&qejnzicp8m(epjnedu')
# DEBUG 配置：生产环境默认为 False，开发环境从环境变量读取（默认为 True）
if IS_PRODUCTION:
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
else:
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

# ALLOWED_HOSTS - 生产环境必须设置
if IS_PRODUCTION:
    allowed_hosts = os.getenv('ALLOWED_HOSTS', '')
    ALLOWED_HOSTS = [host.strip() for host in allowed_hosts.split(',') if host.strip()]
    if not ALLOWED_HOSTS:
        raise ValueError('生产环境必须设置 ALLOWED_HOSTS 环境变量')
else:
    ALLOWED_HOSTS = ['*']  # 开发环境允许所有主机

X_FRAME_OPTIONS = 'SAMEORIGIN'

# CSRF配置
if IS_PRODUCTION:
    # 生产环境从环境变量读取
    csrf_origins = os.getenv('CSRF_TRUSTED_ORIGINS', '')
    CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in csrf_origins.split(',') if origin.strip()]
else:
    # 开发环境允许前端开发服务器的请求
    CSRF_TRUSTED_ORIGINS = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ]

# CSRF Cookie配置
if IS_PRODUCTION:
    # 生产环境使用更安全的设置
    CSRF_COOKIE_HTTPONLY = True
    CSRF_COOKIE_SAMESITE = 'Strict'
    CSRF_USE_SESSIONS = False
else:
    # 开发环境 - 确保跨域请求可以设置cookie
    CSRF_COOKIE_HTTPONLY = False  # 允许JavaScript访问cookie
    CSRF_COOKIE_SAMESITE = 'Lax'  # 允许跨站请求
    CSRF_USE_SESSIONS = False  # 使用cookie而不是session存储token

# =========================================
# 应用配置
# =========================================
INSTALLED_APPS = [
    # Django 内置应用
    'unfold',
    "unfold.contrib.forms",
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    # 'django.contrib.postgres',
    # 项目应用
    'home',
    'qa',
    'comment',                   # 评论系统
    'interactions',              # 用户互动（浏览量和点赞）
    'hadith',
    # 第三方应用
    
    'django_ckeditor_5',          # 富文本编辑器
    'django_bootstrap_icons',     # Bootstrap图标
    'django_icons',
    'crispy_forms',              # 表单美化
    'crispy_bootstrap5',
    # 'bootstrap5',
    # 'django_select2',            # 下拉选择框增强
    'sorl.thumbnail',           # 图片处理
    # # 'mptt',                     # 树形结构
    'rest_framework',           # REST API
]

# =========================================
# 中间件配置
# =========================================
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# 生产环境安全配置
if IS_PRODUCTION:
    # 安全相关设置
    SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'False').lower() == 'true'
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    
    # HSTS (HTTP Strict Transport Security)
    SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', '31536000'))  # 1年
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# =========================================
# 静态文件配置
# =========================================
STATIC_URL = '/static/'
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]
STATIC_ROOT = BASE_DIR / 'staticfiles'  # 添加这一行
# 媒体文件配置
MEDIA_URL = '/media/'
MEDIA_ROOT =  BASE_DIR / 'media'

# 文件存储配置 - 使用自定义压缩存储
DEFAULT_FILE_STORAGE = 'home.storage.CompressedFileSystemStorage' 

# =========================================
# 模板配置
# =========================================
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [TEMPLATE_DIR],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'django.template.context_processors.media',
            ],
        },
    },
]

# =========================================
# 数据库配置
# =========================================
DATABASES = {
    'default': {
        'ENGINE': os.getenv('DB_ENGINE', 'django.db.backends.mysql'),
        'NAME': os.getenv('DB_NAME', 'shuwei'),
        'USER': os.getenv('DB_USER', 'root'),
        'PASSWORD': os.getenv('DB_PASSWORD', '112233'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        } if IS_PRODUCTION else {},
    }
}

# =========================================
# CKEditor配置
# =========================================
# 基础配置
CKEDITOR_5_FILE_STORAGE = "home.storage.CompressedFileSystemStorage"
CKEDITOR_5_ALLOW_ALL_FILE_TYPES = True
CKEDITOR_5_UPLOAD_FILE_TYPES = ['jpeg', 'pdf', 'png']
CKEDITOR_5_UPLOADS = "uploads/"
CKEDITOR_5_FILE_UPLOAD_PERMISSION = "staff"

# 自定义配置
CKEDITOR_5_CUSTOM_CSS = None
CKEDITOR_5_JS = []

# 详细编辑器配置
CKEDITOR_5_CONFIGS = {
    'default': {
        'toolbar': [
            'heading', '|',
            'fontFamily', 'fontSize', 'lineHeight', 'fontColor', 'fontBackgroundColor', '|',
            'bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', '|',
            'alignment',  '|',
            'link', 'bulletedList', 'numberedList', 'todoList', '|',
            'indent', 'outdent', '|',
            'blockQuote', 'insertTable', 'imageUpload', 'mediaEmbed', 'horizontalLine', '|',
            'specialCharacters', '|',
            'highlight', 'removeFormat', '|',
            'undo', 'redo', 'findAndReplace', '|','fullscreen'

        ],
        'pasteFromOffice': {
            'keepFormatting': True  # 保留 Word 的格式
        },
        'fontSize': {
            'options': [
                 '8px', '10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px'
            ]
        },
        'fontColor': {
            'columns': 8,  # 增加颜色选择的列数
            'documentColors': 20,  # 最近使用的颜色数
        },
        'fontBackgroundColor': {
            'columns': 8,
            'documentColors': 20,
        },
        'alignment': {
            'options': ['left', 'center', 'right', 'justify']
        },
        'image': {
            'toolbar': [
                'imageTextAlternative', 'imageStyle:inline', 'imageStyle:alignLeft',
                'imageStyle:alignCenter', 'imageStyle:alignRight', 'resizeImage'
            ],
            'styles': [
                'alignLeft', 'alignCenter', 'alignRight', 'full', 'side'
            ]
        },
        'table': {
            'contentToolbar': [
                'tableColumn', 'tableRow', 'mergeTableCells', 'tableProperties', 'tableCellProperties'
            ]
        },
        'mediaEmbed': {
            'previewsInData': True
        },
        'highlight': {
            'options': [
                {'model': 'yellowMarker', 'class': 'marker-yellow', 'title': '黄色标记', 'color': 'var(--ck-highlight-marker-yellow)', 'type': 'marker'},
                {'model': 'greenMarker', 'class': 'marker-green', 'title': '绿色标记', 'color': 'var(--ck-highlight-marker-green)', 'type': 'marker'},
                {'model': 'pinkMarker', 'class': 'marker-pink', 'title': '粉色标记', 'color': 'var(--ck-highlight-marker-pink)', 'type': 'marker'},
                {'model': 'blueMarker', 'class': 'marker-blue', 'title': '蓝色标记', 'color': 'var(--ck-highlight-marker-blue)', 'type': 'marker'},
                {'model': 'redPen', 'class': 'pen-red', 'title': '红笔', 'color': 'var(--ck-highlight-pen-red)', 'type': 'pen'},
                {'model': 'greenPen', 'class': 'pen-green', 'title': '绿笔', 'color': 'var(--ck-highlight-pen-green)', 'type': 'pen'},
            ]
        },
        'exportPdf': {
            'stylesheets': ['/static/css/export-pdf.css'],  # 定义导出 PDF 的样式
        },
        'exportWord': {
            'stylesheets': ['/static/css/export-word.css'],  # 定义导出 Word 的样式
        },
        'htmlEmbed': {
            'showPreviews': True
        },
        'removeFormat': {
            'toolbar': ['removeFormat']  # 快速清除格式
        },
        'indentBlock': {
            'offset': 1,  # 缩进的间距
            'unit': 'em'
        },
        'pageBreak': True,  # 支持分页符
        'sourceEditing': True,  # 支持源代码编辑
        # 'language': 'zh-cn',  # 暂时移除语言设置，避免语言文件404错误
        'ui': 'default', 
        'tabSpaces':2,
    }
}
CKEDITOR_5_CONFIGS['default']['allowedContent'] = True

# =========================================
# 评论系统配置
# =========================================
SITE_ID = 1

# =========================================
# 表单和认证配置
# =========================================
# Crispy Forms配置
CRISPY_ALLOWED_TEMPLATE_PACKS = "bootstrap5"
CRISPY_TEMPLATE_PACK = "bootstrap5"

# 认证相关


# 密码验证
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# =========================================
# 国际化配置
# =========================================
LANGUAGE_CODE = 'zh-hans'
USE_TZ = False
TIME_ZONE = 'Asia/Shanghai'
USE_I18N = True

# =========================================
# 其他配置
# =========================================
ROOT_URLCONF = 'shuwei.urls'
WSGI_APPLICATION = 'shuwei.wsgi.application'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# 邮件后端配置
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
if EMAIL_BACKEND == 'django.core.mail.backends.smtp.EmailBackend':
    EMAIL_HOST = os.getenv('EMAIL_HOST', '')
    EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
    EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() == 'true'
    EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
    EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
    DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER)

# 消息框架配置
MESSAGE_STORAGE = 'django.contrib.messages.storage.session.SessionStorage'
MESSAGE_TAGS = {
    messages.DEBUG: 'alert-info',
    messages.INFO: 'alert-info',
    messages.SUCCESS: 'alert-success',
    messages.WARNING: 'alert-warning',
    messages.ERROR: 'alert-danger',
}

# 
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
#默认图片
DEFAULT_META_IMAGE = 'images/default-placeholder.png'

# =========================================
# 日志配置
# =========================================
# 确保日志目录存在（如果需要文件日志）
log_dir = BASE_DIR / 'logs'
use_file_logging = IS_PRODUCTION
if use_file_logging:
    try:
        log_dir.mkdir(exist_ok=True)
    except (OSError, PermissionError):
        # 如果无法创建日志目录，只使用控制台日志
        use_file_logging = False

# 构建日志配置
logging_handlers = {
    'console': {
        'class': 'logging.StreamHandler',
        'formatter': 'simple',
    },
}

# 只在可以使用文件日志时添加文件处理器
if use_file_logging:
    logging_handlers['file'] = {
        'class': 'logging.FileHandler',
        'filename': str(log_dir / 'django.log'),
        'formatter': 'verbose',
    }

# 确定使用的处理器列表
if use_file_logging:
    default_handlers = ['console', 'file']
else:
    default_handlers = ['console']

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': logging_handlers,
    'root': {
        'handlers': default_handlers,
        'level': 'INFO' if IS_PRODUCTION else 'INFO',  # 开发环境也使用 INFO，减少日志输出
    },
    'loggers': {
        'django': {
            'handlers': default_handlers,
            'level': 'INFO' if IS_PRODUCTION else 'INFO',  # 开发环境也使用 INFO
            'propagate': False,
        },
        'django.request': {
            'handlers': default_handlers,
            'level': 'ERROR',
            'propagate': False,
        },
        # 减少开发环境下的 SQL 查询日志输出
        'django.db.backends': {
            'handlers': default_handlers,
            'level': 'WARNING',  # 只显示警告和错误，不显示所有 SQL 查询
            'propagate': False,
        },
        # 减少模板相关的日志输出
        'django.template': {
            'handlers': default_handlers,
            'level': 'WARNING',
            'propagate': False,
        },
        # 减少静态文件相关的日志输出
        'django.contrib.staticfiles': {
            'handlers': default_handlers,
            'level': 'WARNING',
            'propagate': False,
        },
        # 减少开发服务器相关的日志输出
        'django.server': {
            'handlers': default_handlers,
            'level': 'INFO',  # 保留基本的请求信息
            'propagate': False,
        },
    },
}

UNFOLD = {
    # 网站基本信息
    "SITE_TITLE": "素材管理系统",
    "SITE_HEADER": "素材库后台",
    "SITE_URL": "/",
    "SITE_SYMBOL": "settings",  # 网站图标（Material Symbols）
    
    # Dashboard 回调函数
    "DASHBOARD_CALLBACK": "shuwei.admin_dashboard.dashboard_callback",
    
    # 登录页面配置
    "LOGIN": {
        "image": None,  # 登录页面背景图片
        "redirect_after": None,  # 登录后重定向URL
    },
    
    # 侧边栏配置
    "SIDEBAR": {
        "show_search": True,  # 显示搜索框
        "show_all_applications": False,  # 不显示所有应用
        "navigation": [
            {
                "title": "内容管理",
                "separator": True,  # 显示分隔符
                "items": [
                    {
                        "title": "书库",
                        "icon": "library_books",
                        "link": "/admin/home/书库/",
                    },
                    {
                        "title": "书讯",
                        "icon": "newspaper",
                        "link": "/admin/home/书讯/",
                    },
                    {
                        "title": "书评",
                        "icon": "rate_review",
                        "link": "/admin/home/书评/",
                    },
                    {
                        "title": "古籍",
                        "icon": "menu_book",
                        "link": "/admin/home/古籍/",
                    },
                    {
                        "title": "文史",
                        "icon": "history_edu",
                        "link": "/admin/home/文史/",
                    },
                    {
                        "title": "文艺",
                        "icon": "palette",
                        "link": "/admin/home/文艺/",
                    },
                    {
                        "title": "观点",
                        "icon": "lightbulb",
                        "link": "/admin/home/观点/",
                    },
                    {
                        "title": "论文",
                        "icon": "article",
                        "link": "/admin/home/论文/",
                    },
                    {
                        "title": "译林",
                        "icon": "translate",
                        "link": "/admin/home/译林/",
                    },
                    {
                        "title": "通讯",
                        "icon": "email",
                        "link": "/admin/home/通讯/",
                    },
                ],
            },
            {
                "title": "用户与权限",
                "separator": True,
                "items": [
                    {
                        "title": "用户管理",
                        "icon": "people",
                        "link": "/admin/auth/user/",
                    },
                    {
                        "title": "用户组",
                        "icon": "group",
                        "link": "/admin/auth/group/",
                    },
                ],
            },
            {
                "title": "评论管理",
                "separator": True,
                "items": [
                    {
                        "title": "评论",
                        "icon": "comment",
                        "link": "/admin/comment/comment/",
                    },
                ],
            },
            {
                "title": "问答管理",
                "separator": True,
                "items": [
                    {
                        "title": "问题",
                        "icon": "help",
                        "link": "/admin/qa/question/",
                    },
                ],
            },
            {
                "title": "用户反馈",
                "separator": True,
                "items": [
                    {
                        "title": "用户反馈",
                        "icon": "feedback",
                        "link": "/admin/home/feedback/",
                    },
                ],
            },
            {
                "title": "互动管理",
                "separator": True,
                "items": [
                    {
                        "title": "用户互动",
                        "icon": "thumb_up",
                        "link": "/admin/interactions/userreaction/",
                    },
                    {
                        "title": "浏览量统计",
                        "icon": "visibility",
                        "link": "/admin/interactions/viewcount/",
                    },
                    {
                        "title": "浏览记录",
                        "icon": "history",
                        "link": "/admin/interactions/viewrecord/",
                    },
                ],
            },
            {
                "title": "圣训管理",
                "separator": True,
                "items": [
                    {
                        "title": "圣训集",
                        "icon": "book",
                        "link": "/admin/hadith/hadithcollection/",
                    },
                    {
                        "title": "圣训",
                        "icon": "menu_book",
                        "link": "/admin/hadith/hadith/",
                    },
                ],
            },
        ],
    },
    
    # 主题颜色配置
    "COLORS": {
        "primary": {
            "50": "250 245 255",
            "100": "243 232 255",
            "200": "233 213 255",
            "300": "216 180 254",
            "400": "192 132 252",
            "500": "168 85 247",
            "600": "147 51 234",
            "700": "126 34 206",
            "800": "107 33 168",
            "900": "88 28 135",
        },
    },
    
    # 扩展配置
    "EXTENSIONS": {
        "modeltranslation": {
            "flags": {
                "en": "🇬🇧",
                "fr": "🇫🇷",
                "nl": "🇳🇱",
            },
        },
    },
    
    # 标签页配置
    "TABS": [],
    
    # 自定义样式和脚本
    "STYLES": [
        lambda request: "/static/unfold/css/custom.css",
    ],
    "SCRIPTS": [],
    
    # 显示历史记录和查看站点链接
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": True,
}