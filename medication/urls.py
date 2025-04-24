from django.urls import path
from . import views



urlpatterns = [
    path('medicine_dboard/', views.medication_dashboard, name='medication_dashboard'),
    path('pharmacy-finder/', views.pharmacy_finder, name='pharmacy_finder'),
    path('api/medications/', views.medication_list, name='medication_list'),
    path('api/medications/<int:medication_id>/', views.medication_detail, name='medication_detail'),
    path('api/medications/<int:medication_id>/refill/', views.refill_medication, name='refill_medication'),
    path('otc-prescription/', views.otc_prescription_view, name='otc_prescription'),
    path('api/get-otc-recommendation/', views.get_otc_recommendation, name='get_otc_recommendation'),
    path('api/tracking/<str:date>/', views.tracking_data, name='tracking_data'),
    path('api/get-drug-discounts/', views.get_drug_discounts, name='get-drug-discounts'),
    path('drug-discounts/', views.drug_discounts_page, name='drug-discounts'),
]