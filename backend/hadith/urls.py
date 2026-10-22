from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HadithViewSet, HadithCollectionViewSet, quran_proxy
from .quran_reader import reader_proxy

router = DefaultRouter()
router.register(r'hadiths', HadithViewSet, basename='hadith')
router.register(r'collections', HadithCollectionViewSet, basename='hadithcollection')

urlpatterns = [
    path('', include(router.urls)),
    path('quran-reader/<str:resource>/<int:number>/', reader_proxy),
    path('quran/<str:edition>/<path:path>', quran_proxy),  # 视图校验章节号与版本
    path('quran/<str:edition>/', quran_proxy),             # 缺少章节号时返回 400
]

