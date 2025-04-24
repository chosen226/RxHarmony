import os
import json
import traceback
from datetime import datetime, timedelta, date

from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout, authenticate, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.views.decorators.http import require_POST, require_http_methods
from django.views.decorators.csrf import csrf_exempt

from medication.models import Medication

from .models import Profile, Condition


try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

@csrf_exempt
def home(request):
    return render(request, 'login.html')

@csrf_exempt
def register(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')
        confirm_password = data.get('confirm_password')
        #checking if passwords match
        if password != confirm_password:
            return JsonResponse({'error': 'Passwords do not match'}, status=400)
        #checking if email is already registered
        if User.objects.filter(email=email).exists():
            return JsonResponse({'error': 'Email already registered'}, status=400)

        user = User.objects.create_user(username=email, email=email, password=password)
        login(request, user)
        return JsonResponse({'success': True, 'redirect_url': '/profile/setup'})

    return render(request, 'register.html')

@csrf_exempt
@require_http_methods(["GET", "POST"])
def login_view(request):
    if request.method == "GET":
        # checking if user is authenticated and going to profile otherwise going to login again
        if request.user.is_authenticated:
            return redirect('profile')
        return render(request, 'login.html')

    try:
        
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return JsonResponse({
                'error': 'Please provide both email and password'
            }, status=400)

        try:
            #checking if user exists
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return JsonResponse({
                'error': 'No account found with this email'
            }, status=404)
        # if they exist then check the password
        user = authenticate(request, username=user.username, password=password)

        if user is not None:
            login(request, user)
            return JsonResponse({
                'redirect_url': '/profile/'
            })
        else:
            return JsonResponse({
                'error': 'Invalid password'
            }, status=401)

    except json.JSONDecodeError:
        return JsonResponse({
            'error': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'error': 'An error occurred while processing your request'
        }, status=500)

@csrf_exempt
@login_required
@require_http_methods(["POST"])
def logout_view(request):
    try:
        #logs out and redirects to login
        logout(request)
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'redirect_url': '/login/'
            })
        
        return redirect('login')

    except Exception as e:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'error': 'An error occurred during logout'
            }, status=500)
        return redirect('login')

@csrf_exempt
@login_required
def change_password_page(request):
    return render(request, 'changepw.html')

@csrf_exempt
@login_required
def change_password(request):
    try:
        data = json.loads(request.body)
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        # if a field is empty then we get an error
        if not current_password or not new_password:
            return JsonResponse({
                'success': False,
                'error': 'Current password and new password are required.'
            })
        
        if not request.user.check_password(current_password):
            return JsonResponse({
                'success': False,
                'error': 'Your current password is incorrect.'
            })
        #condition for new password
        if len(new_password) < 8:
            return JsonResponse({
                'success': False,
                'error': 'New password must be at least 8 characters long.'
            })
        # new passowrd is set
        request.user.set_password(new_password)
        request.user.save()
        
        update_session_auth_hash(request, request.user)
        
        return JsonResponse({
            'success': True,
            'message': 'Password changed successfully.'
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON data.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })

@csrf_exempt
@login_required
def profile_setup(request):
    #gets all the profile information for profile set up or creates profile object if it does not exist
    if request.method == 'GET':
        profile, created = Profile.objects.get_or_create(user=request.user)
        
        medications = list(profile.medications.values_list('name', flat=True))
        conditions = list(profile.medical_conditions.values_list('name', flat=True))
        # all the information from the data base is sent or if it is not set then empty '' are sent
        context = {
            'profile_data': {
                'date_of_birth': profile.date_of_birth.strftime('%Y-%m-%d') if profile.date_of_birth else '',
                'gender': profile.gender or '',
                'blood_type': profile.blood_type or '',
                'allergies': profile.allergies or '',
                'emergency_contact': profile.emergency_contact or '',
                'emergency_contact_phone': profile.emergency_contact_phone or '',
                'medications_json': json.dumps(medications),
                'conditions_json': json.dumps(conditions),
            }
        }
        return render(request, 'profile_setup.html', context)
    # this means information is being sent to store
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            profile, created = Profile.objects.get_or_create(user=request.user)
            
            profile.date_of_birth = data.get('date_of_birth')
            profile.gender = data.get('gender')
            profile.blood_type = data.get('blood_type')
            profile.allergies = data.get('allergies')
            profile.emergency_contact = data.get('emergency_contact')
            profile.emergency_contact_phone = data.get('emergency_contact_phone')
            profile.save()

            profile.medications.all().delete()
            for med_name in data.get('medications', []):
                Medication.objects.create(
                    profile=profile,
                    name=med_name
                )

            profile.medical_conditions.all().delete()
            for condition_name in data.get('conditions', []):
                Condition.objects.create(
                    profile=profile,
                    name=condition_name
                )

            return JsonResponse({'redirect_url': '/profile/'})
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@login_required
def profile_view(request):
    # seding all the information back
    profile = request.user.profile
    context = {
        'user': request.user,
        'profile': profile,
        'medications': profile.medications.all(),
        'conditions': profile.medical_conditions.all()
    }
    return render(request, 'profile.html', context)

@csrf_exempt
@login_required
@require_http_methods(["POST"])
def profile_update_api(request):
    try:
        profile = request.user.profile
        
        data = json.loads(request.body)
        
        if 'date_of_birth' in data and data['date_of_birth']:
            profile.date_of_birth = data['date_of_birth']
        
        if 'gender' in data:
            profile.gender = data['gender']
            
        if 'blood_type' in data:
            profile.blood_type = data['blood_type']
            
        if 'allergies' in data:
            profile.allergies = data['allergies']
            
        if 'emergency_contact' in data:
            profile.emergency_contact = data['emergency_contact']
            
        if 'emergency_contact_phone' in data:
            profile.emergency_contact_phone = data['emergency_contact_phone']
        
        profile.save()
        
        if 'conditions' in data and isinstance(data['conditions'], list):
            current_conditions = list(profile.medical_conditions.values_list('name', flat=True))
            
            conditions_to_add = [c for c in data['conditions'] if c not in current_conditions]
            conditions_to_remove = [c for c in current_conditions if c not in data['conditions']]
            
            if conditions_to_remove:
                profile.medical_conditions.filter(name__in=conditions_to_remove).delete()
            
            for condition_name in conditions_to_add:
                Condition.objects.create(
                    profile=profile,
                    name=condition_name
                )
        
        return JsonResponse({
            'success': True,
            'message': 'Profile updated successfully'
        })
        
    except Exception as e:
        print(f"Error in profile_update_api: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@csrf_exempt
@login_required
@require_http_methods(["GET"])
def profile_api(request):
    try:
        profile = request.user.profile
        
        conditions = []
        try:
            conditions = list(profile.medical_conditions.all().values('id', 'name', 'description'))
        except Exception as condition_error:
            print(f"Error fetching conditions: {str(condition_error)}")
        
        profile_data = {
            'date_of_birth': profile.date_of_birth.isoformat() if profile.date_of_birth else None,
            'gender': profile.gender,
            'blood_type': profile.blood_type,
            'allergies': profile.allergies,
            'emergency_contact': profile.emergency_contact,
            'emergency_contact_phone': profile.emergency_contact_phone,
            'conditions': conditions,
            'created_at': profile.created_at.isoformat(),
            'updated_at': profile.updated_at.isoformat()
        }
        
        return JsonResponse(profile_data)
    except Exception as e:
        print(f"Error in profile_api: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@login_required
def medication_dashboard(request):
    return render(request, 'dashboard.html')

