from django.urls import path
from . import views

app_name = 'interactions'

urlpatterns = [
    # 点赞/点踩 API
    path('api/like/<str:app_label>/<str:model_name>/<int:item_id>/', views.like_item, name='like_item'),
    path('api/dislike/<str:app_label>/<str:model_name>/<int:item_id>/', views.dislike_item, name='dislike_item'),
    
    # 浏览量 API
    path('api/view/<str:app_label>/<str:model_name>/<int:item_id>/', views.update_view_count, name='update_view_count'),
    path('api/view/<str:app_label>/<str:model_name>/<int:item_id>/get/', views.get_view_count, name='get_view_count'),
]
