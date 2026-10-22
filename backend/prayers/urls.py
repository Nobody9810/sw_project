from django.urls import path
from . import views

urlpatterns = [path('options/', views.options, name='options'), path('times/', views.times, name='times')]
