# Create your views here.
from django.urls import include, path
from . import views
urlpatterns = [
    path('', views.home, name="home"),
    path('register/', views.register, name='register'),
    path('profile/setup/', views.profile_setup, name='profile_setup'),
    path('login/', views.login_view, name='login'),
    path('profile/', views.profile_view, name='profile'),
    path('logout/', views.logout_view, name='logout')
    # path('/', views.profile_view, name='profile')
    # path('profile/', views.profile_view, name='profile'),  # For viewing the profile after setup
    
]
