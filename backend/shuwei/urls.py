"""shuwei URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from home.ckeditor_views import upload_file as ckeditor_upload_file

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/qa/', include(('qa.urls', 'qa'), namespace='qa')),
    path('api/hadith/', include(('hadith.urls', 'hadith'), namespace='hadith')),
    path('', include(('home.urls', 'home'), namespace='home')),
    path('comment/', include(('comment.urls', 'comment'), namespace='comment')),
    path('interactions/', include(('interactions.urls', 'interactions'), namespace='interactions')),
    # 使用自定义的CKEditor上传视图（支持压缩）
    # 注意：必须在include之前定义，以覆盖默认的上传视图
    path('ckeditor5/image_upload/', ckeditor_upload_file, name='ck_editor_5_upload_file'),
    path('ckeditor5/', include('django_ckeditor_5.urls')),  # 其他CKEditor URL
]

if settings.DEBUG:
    # 开发环境下，Django 的 runserver 会自动处理静态文件
    # 但为了确保 CKEditor5 等第三方应用的静态文件可以访问，需要手动配置
    # 注意：STATIC_ROOT 是收集静态文件的目录，在开发环境下也应该存在
    from django.contrib.staticfiles.urls import staticfiles_urlpatterns
    urlpatterns += staticfiles_urlpatterns()
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
