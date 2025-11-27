from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HadithViewSet, HadithCollectionViewSet, quran_proxy

router = DefaultRouter()
router.register(r'hadiths', HadithViewSet, basename='hadith')
router.register(r'collections', HadithCollectionViewSet, basename='hadithcollection')

urlpatterns = [
    path('', include(router.urls)),
    path('quran/<str:edition>/<path:path>', quran_proxy),  # 支持所有路径
    path('quran/<str:edition>/', quran_proxy),             # 整本经文
]

