from django.urls import path,include
from . import views
from django.views.generic import TemplateView
from django.contrib import admin

urlpatterns = [
    path('版权声明/', views.copyright, name='T-P'),
    path('关于我们/', views.about_us, name='about_us'),
    path('搜索/',views.SearchAll,name='searchAll'),
    path('',views.MainView.as_view(),name="homepage"),
    path('搜索/', views.SearchAll, name='search'),
    path('通讯/', views.TongXun.as_view(),name='tongxun'),
    path('书讯/', views.ShuXun.as_view(), name='shuxun'),
    path('书评/', views.ShuPing.as_view(), name='shuping'),
    path('观点/', views.GuanDian.as_view(), name='guandian'),
    path('文艺/', views.WenYi.as_view(), name='wenyi'),
    path('文史/', views.WenShi.as_view(), name='wenshi'),
    path('译林/',views.YiLing.as_view(), name='yiling'),
    path('书库/', views.ShuKu.as_view(), name='shuku'),
    path('古籍/', views.GuJi.as_view(), name='guji'),
    path('论文/', views.LunWen.as_view(), name='lunwen'),
    path('书评/分类/<int:category_id>/', views.ShuPing_categories, name='category_detail'),
    path('通讯/<int:tongxun_id>/', views.TongXunDetail.as_view(), name='通讯detail'),
    path('书讯/<int:shuxun_id>/', views.ShuXunDetail.as_view(), name='书讯detail'),
    path('书评/<int:shuping_id>/', views.ShuPingDetail.as_view(), name='书评detail'),
    path('观点/<int:guandian_id>/', views.GuanDianDetail.as_view(), name='观点detail'),
    path('文艺/<int:wenyi_id>/', views.WenYiDetail.as_view(), name='文艺detail'),
    path('文史/<int:wenshi_id>/', views.WenShiDetail.as_view(), name='文史detail'),
    path('译林/<int:yiling_id>/', views.YiLingDetail.as_view(), name='译林detail'),
    path('书库/<int:shuku_id>/', views.ShuKuDetail.as_view(), name='书库detail'),
    path('古籍/<int:guji_id>/', views.GuJiDetail.as_view(), name='古籍detail'),
    path('论文/<int:lunwen_id>/', views.LunWenDetail.as_view(), name='论文detail'),

    # 点赞/点踩 API 已迁移到 interactions app
    # 保留这些 URL 作为向后兼容的重定向（可选）
    # path('api/like/<str:app_label>/<str:model_name>/<int:item_id>/', views.like_item, name='like_item'),
    # path('api/dislike/<str:app_label>/<str:model_name>/<int:item_id>/', views.dislike_item, name='dislike_item'),
    path('api/search/', views.api_search_all, name='api_search'),
    path('api/feedback/', views.api_feedback, name='api_feedback'),
    path('api/book-review-categories/', views.api_book_review_categories, name='api_book_review_categories'),
    path('api/book-reviews/category/<int:category_id>/', views.api_book_reviews_by_category, name='api_book_reviews_by_category'),
    path('api/<str:content_type>/<int:item_id>/', views.api_detail_view, name='api_detail'),
    # API 列表端点
    path('api/<str:content_type>/', views.api_list_view, name='api_list'),



]



