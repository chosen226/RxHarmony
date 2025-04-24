from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name="home"),
    path('register/', views.register, name='register'),
    path('profile/setup/', views.profile_setup, name='profile_setup'),
    path('login/', views.login_view, name='login'),
    path('profile/', views.profile_view, name='profile'),
    path('logout/', views.logout_view, name='logout'),
    path('change_password_page/', views.change_password_page, name='change_password_page'),
    path('changepw/', views.change_password, name='change_password'),
    path('api/profile/', views.profile_api, name='profile_api'),
    path('api/profile/update/', views.profile_update_api, name='profile_update_api'),
]