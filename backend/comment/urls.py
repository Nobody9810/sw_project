from django.urls import path
from . import views

app_name = 'comment'

urlpatterns = [
    path('csrf-token/', views.get_csrf_token_view, name='csrf_token'),
    path('create/<str:app_label>/<str:model_name>/<int:object_id>/', 
         views.CommentCreateView.as_view(), 
         name='create'),
    path('api/<str:app_label>/<str:model_name>/<int:object_id>/', 
         views.comment_list_api, 
         name='list_api'),
]

