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
    
    # path('/', views.profile_view, name='profile')
    # path('profile/', views.profile_view, name='profile'),  # For viewing the profile after setup
    # path('medicine_chart/', views.medicine_chart, name='medicine_chart'),
    path('medicine_dboard', views.medication_dashboard, name='medication_dashboard'),
    # path('add/', views.add_medication, name='add_medication'),
    # path('edit/<int:medication_id>/', views.edit_medication, name='edit_medication'),
    # path('delete/<int:medication_id>/', views.delete_medication, name='delete_medication'),
    # path('toggle-dose/<int:tracking_id>/<int:dose_index>/', views.toggle_dose, name='toggle_dose'),
    # path('reset-tracking/', views.reset_tracking, name='reset_tracking'),
   path('api/medications/', views.medication_list, name='medication_list'),  # Handles both GET and POST
    path('api/medications/<int:medication_id>/', views.medication_detail, name='medication_detail'),  # Handles PUT and DELETE
    
    # API endpoints for tracking
    path('api/tracking/<str:date>/', views.tracking_data, name='tracking_data'),  # Handles both GET and POST
    
]
