# Create your views here.
from django.urls import include, path
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
    path('medicine_dboard', views.medication_dashboard, name='medication_dashboard'),
    path('pharmacy-finder/', views.pharmacy_finder, name='pharmacy_finder'),
   path('api/medications/', views.medication_list, name='medication_list'),  # Handles both GET and POST
    path('api/medications/<int:medication_id>/', views.medication_detail, name='medication_detail'),  # Handles PUT and DELETE
    path('api/medications/<int:medication_id>/refill/', views.refill_medication, name='refill_medication'),
     path('otc-prescription/', views.otc_prescription_view, name='otc_prescription'),
    # API endpoints for tracking
    path('api/get-otc-recommendation/', views.get_otc_recommendation, name='get_otc_recommendation'),
    path('api/tracking/<str:date>/', views.tracking_data, name='tracking_data'),  # Handles both GET and POST
    
]
