from django.urls import path
from . import views

app_name = 'user_auth'
urlpatterns = [
    path('session/', views.session_status, name='session'),
    path('logout/', views.logout_session, name='logout'),
    path('profile/', views.update_profile, name='profile'),
    path('avatar/', views.update_avatar, name='avatar'),
]
