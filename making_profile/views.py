from django.http import HttpResponse
from django.shortcuts import render

def home (request):
    return HttpResponse("this is working")
# views.py
from django.shortcuts import render, redirect
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.contrib.auth.models import User
from .forms import ProfileForm
from .models import Medication, Condition
import json

def register(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')
        confirm_password = data.get('confirm_password')

        if password != confirm_password:
            return JsonResponse({'error': 'Passwords do not match'}, status=400)
        
        if User.objects.filter(email=email).exists():
            return JsonResponse({'error': 'Email already registered'}, status=400)

        # Create user
        user = User.objects.create_user(username=email, email=email, password=password)
        login(request, user)
        return JsonResponse({'success': True, 'redirect_url': '/profile/setup'})

    return render(request, 'register.html')

# views.py
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from .models import Profile, Medication, Condition
import json

@login_required
def profile_setup(request):
    if request.method == 'GET':
        # Get or create a profile for the user
        profile, created = Profile.objects.get_or_create(user=request.user)
        
        # Get existing medications and conditions
        medications = list(profile.medications.values_list('name', flat=True))
        conditions = list(profile.medical_conditions.values_list('name', flat=True))
        
        # Prepare context with existing data
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

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            profile, created = Profile.objects.get_or_create(user=request.user)
            
            # Update profile fields
            profile.date_of_birth = data.get('date_of_birth')
            profile.gender = data.get('gender')
            profile.blood_type = data.get('blood_type')
            profile.allergies = data.get('allergies')
            profile.emergency_contact = data.get('emergency_contact')
            profile.emergency_contact_phone = data.get('emergency_contact_phone')
            profile.save()

            # Update medications
            profile.medications.all().delete()
            for med_name in data.get('medications', []):
                Medication.objects.create(
                    profile=profile,
                    name=med_name
                )

            # Update conditions
            profile.medical_conditions.all().delete()
            for condition_name in data.get('conditions', []):
                Condition.objects.create(
                    profile=profile,
                    name=condition_name
                )

            return JsonResponse({'redirect_url': '/profile/'})
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

# views.py
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from .models import Profile

@login_required
def profile_view(request):
    profile = request.user.profile
    context = {
        'user': request.user,
        'profile': profile,
        'medications': profile.medications.all(),  # Using the new related_name
        'conditions': profile.medical_conditions.all()  # Using the new related_name
    }
    return render(request, 'profile.html', context)


from django.shortcuts import redirect
from django.contrib.auth import logout,authenticate
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
@login_required
@require_http_methods(["POST"])
def logout_view(request):
    """
    Handle user logout. Requires user to be authenticated and accepts only POST requests
    for security. Returns JSON response for AJAX requests or redirects for regular requests.
    """
    try:
        # Clear the user's session
        logout(request)
        
        # Check if it's an AJAX request
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'redirect_url': '/login/'  # Change this to your login page URL
            })
        
        # For non-AJAX requests, redirect to login page
        return redirect('login')  # Make sure you have a 'login' URL pattern named this

    except Exception as e:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'error': 'An error occurred during logout'
            }, status=500)
        return redirect('login')  # Redirect to login page even if there's an error
@require_http_methods(["GET", "POST"])
def login_view(request):
    """
    Handle user login - both GET requests for the login page and
    POST requests for authentication.
    """
    if request.method == "GET":
        # If user is already authenticated, redirect to home
        if request.user.is_authenticated:
            return redirect('profile')  # Make sure you have a 'home' URL pattern defined
        return render(request, 'login.html')

    # Handle POST request
    try:
        print("we are getting to the request")
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return JsonResponse({
                'error': 'Please provide both email and password'
            }, status=400)

        # Since Django's default User model uses username, we need to get the user by email first
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return JsonResponse({
                'error': 'No account found with this email'
            }, status=404)

        # Authenticate using the username (since that's what Django's auth system uses)
        user = authenticate(request, username=user.username, password=password)

        if user is not None:
            login(request, user)
            return JsonResponse({
                'redirect_url': '/profile/'  # Change this to your desired redirect URL
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
    
# def medicine_chart(request):
# from django.shortcuts import render, redirect, get_object_or_404
# from django.http import JsonResponse
# from django.views.decorators.http import require_POST
# from django.contrib.auth.decorators import login_required
# from django.utils import timezone
# from .models import Medication, MedicationTracking, Profile
# from .forms import MedicationForm

@login_required
def medication_dashboard(request):
    """View for the main medication dashboard with both tabs"""
    # profile = Profile.objects.get(user=request.user)
    # medications = Medication.objects.filter(profile=profile).order_by('name')
    
    # # Get today's tracking for each medication
    # for medication in medications:
    #     medication.today_tracking = medication.get_tracking_for_today()
    
    # # For new medication form
    # form = MedicationForm()
    
    # context = {
    #     'medications': medications,
    #     'form': form,
    # }
    return render(request, 'dashboard.html')

# @login_required
# def add_medication(request):
#     """Handle adding a new medication"""
#     if request.method == 'POST':
#         form = MedicationForm(request.POST)
#         if form.is_valid():
#             medication = form.save(commit=False)
#             profile = Profile.objects.get(user=request.user)
#             medication.profile = profile
#             medication.save()
#             # Create initial tracking for today
#             medication.get_tracking_for_today()
#             return redirect('medication_dashboard')
#     else:
#         form = MedicationForm()
    
#     return render(request, 'medication_form.html', {'form': form})

# @login_required
# def edit_medication(request, medication_id):
#     """Handle editing an existing medication"""
#     medication = get_object_or_404(Medication, id=medication_id, profile__user=request.user)
    
#     if request.method == 'POST':
#         form = MedicationForm(request.POST, instance=medication)
#         if form.is_valid():
#             form.save()
#             # Update tracking if frequency changed
#             tracking = medication.get_tracking_for_today()
#             if len(tracking.doses_taken) != medication.frequency_per_day:
#                 # Copy over existing values, pad with False if frequency increased
#                 old_doses = tracking.doses_taken
#                 new_doses = [False] * medication.frequency_per_day
#                 for i in range(min(len(old_doses), medication.frequency_per_day)):
#                     new_doses[i] = old_doses[i]
#                 tracking.doses_taken = new_doses
#                 tracking.save()
#             return redirect('medication_dashboard')
#     else:
#         form = MedicationForm(instance=medication)
    
#     return render(request, 'medication_form.html', {'form': form, 'medication': medication})

# @login_required
# def delete_medication(request, medication_id):
#     """Handle deleting a medication"""
#     medication = get_object_or_404(Medication, id=medication_id, profile__user=request.user)
    
#     if request.method == 'POST':
#         medication.delete()
#         return redirect('medication_dashboard')
    
#     return render(request, 'confirm_delete.html', {'medication': medication})

# @login_required
# @require_POST
# def toggle_dose(request, tracking_id, dose_index):
#     """Toggle a specific dose for a medication tracking"""
#     tracking = get_object_or_404(MedicationTracking, 
#                                 id=tracking_id, 
#                                 medication__profile__user=request.user)
    
#     success = tracking.toggle_dose(int(dose_index))
    
#     return JsonResponse({
#         'success': success,
#         'doses_taken': tracking.doses_taken
#     })

# @login_required
# def reset_tracking(request):
#     """Reset all tracking for the current user for today (manual reset)"""
#     if request.method == 'POST':
#         profile = Profile.objects.get(user=request.user)
#         medications = Medication.objects.filter(profile=profile)
        
#         for medication in medications:
#             medication.reset_daily_tracking()
        
#         return JsonResponse({'success': True})
    
#     return JsonResponse({'success': False}, status=400)

# # This would be called by a scheduled task/cronjob at midnight
# def reset_all_tracking():
#     """Reset all medication tracking (to be called by a scheduled task)"""
#     MedicationTracking.reset_all_tracking()

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.shortcuts import get_object_or_404
import json
from datetime import datetime
from django.contrib.auth.decorators import login_required
from .models import Medication, Profile, MedicationTracking  # Assuming you have a MedicationTracking model

# @login_required
# @require_http_methods(["GET"])
# def get_medications(request):
#     """Get all medications for the current user"""
#     # Get the user's profile
#     profile = Profile.objects.get(user=request.user)
    
#     # Get medications for this profile
#     medications = Medication.objects.filter(profile=profile)
    
#     # Convert to list of dictionaries for JSON response
#     medications_list = []
#     for med in medications:
#         medications_list.append({
#             'id': med.id,
#             'name': med.name,
#             'description': med.description,
#             'refill_date': med.refill_date.isoformat() if med.refill_date else None,
#             'frequency_per_day': med.frequency_per_day,
#             'tablets_per_dose': float(med.tablets_per_dose),
#             'created_at': med.created_at.isoformat()
#         })
    
#     return JsonResponse(medications_list, safe=False)

# @login_required
# @require_http_methods(["POST"])
# def add_medication(request):
#     """Add a new medication"""
#     try:
#         # Parse the request data
#         data = json.loads(request.body)
        
#         # Get the user's profile
#         profile = Profile.objects.get(user=request.user)
        
#         # Create new medication
#         medication = Medication(
#             profile=profile,
#             name=data.get('name'),
#             description=data.get('description', ''),
#             frequency_per_day=data.get('frequency_per_day', 1),
#             tablets_per_dose=data.get('tablets_per_dose', 1)
#         )
        
#         # Handle refill date (which can be null)
#         if data.get('refill_date'):
#             medication.refill_date = data.get('refill_date')
        
#         medication.save()
        
#         # Return the newly created medication
#         return JsonResponse({
#             'id': medication.id,
#             'name': medication.name,
#             'description': medication.description,
#             'refill_date': medication.refill_date.isoformat() if medication.refill_date else None,
#             'frequency_per_day': medication.frequency_per_day,
#             'tablets_per_dose': float(medication.tablets_per_dose),
#             'created_at': medication.created_at.isoformat()
#         })
#     except Exception as e:
#         return JsonResponse({'error': str(e)}, status=400)

# @login_required
# @require_http_methods(["PUT"])
# def update_medication(request, medication_id):
#     """Update an existing medication"""
#     try:
#         # Get the medication to update
#         profile = Profile.objects.get(user=request.user)
#         medication = get_object_or_404(Medication, id=medication_id, profile=profile)
        
#         # Parse the request data
#         data = json.loads(request.body)
        
#         # Update medication fields
#         medication.name = data.get('name', medication.name)
#         medication.description = data.get('description', medication.description)
#         medication.frequency_per_day = data.get('frequency_per_day', medication.frequency_per_day)
#         medication.tablets_per_dose = data.get('tablets_per_dose', medication.tablets_per_dose)
        
#         # Handle refill date (which can be null)
#         if 'refill_date' in data:
#             medication.refill_date = data.get('refill_date') or None
        
#         medication.save()
        
#         # Return the updated medication
#         return JsonResponse({
#             'id': medication.id,
#             'name': medication.name,
#             'description': medication.description,
#             'refill_date': medication.refill_date.isoformat() if medication.refill_date else None,
#             'frequency_per_day': medication.frequency_per_day,
#             'tablets_per_dose': float(medication.tablets_per_dose),
#             'created_at': medication.created_at.isoformat()
#         })
#     except Exception as e:
#         return JsonResponse({'error': str(e)}, status=400)

# @login_required
# @require_http_methods(["DELETE"])
# def delete_medication(request, medication_id):
#     """Delete a medication"""
#     try:
#         # Get the medication to delete
#         profile = Profile.objects.get(user=request.user)
#         medication = get_object_or_404(Medication, id=medication_id, profile=profile)
        
#         # Delete the medication
#         medication.delete()
        
#         return JsonResponse({'success': True})
#     except Exception as e:
#         return JsonResponse({'error': str(e)}, status=400)

# @login_required
# @require_http_methods(["GET"])
# def get_tracking(request, date):
#     """Get tracking data for a specific date"""
#     try:
#         # Parse the date
#         tracking_date = datetime.strptime(date, '%Y-%m-%d').date()
        
#         # Get the user's profile
#         profile = Profile.objects.get(user=request.user)
        
#         # Assuming you have a MedicationTracking model
#         tracking = MedicationTracking.objects.filter(
#             profile=profile,
#             date=tracking_date
#         ).first()
        
#         if tracking:
#             return JsonResponse({
#                 'tracking': json.loads(tracking.tracking_data)
#             })
#         else:
#             # Return empty tracking data
#             return JsonResponse({
#                 'tracking': {}
#             })
#     except Exception as e:
#         return JsonResponse({'error': str(e)}, status=400)

# @login_required
# @require_http_methods(["POST"])
# def save_tracking(request, date):
#     """Save tracking data for a specific date"""
#     try:
#         # Parse the date
#         tracking_date = datetime.strptime(date, '%Y-%m-%d').date()
        
#         # Get the request data
#         data = json.loads(request.body)
#         tracking_data = data.get('tracking', {})
        
#         # Get the user's profile
#         profile = Profile.objects.get(user=request.user)
        
#         # Assuming you have a MedicationTracking model
#         tracking, created = MedicationTracking.objects.get_or_create(
#             profile=profile,
#             date=tracking_date,
#             defaults={'tracking_data': json.dumps(tracking_data)}
#         )
        
#         if not created:
#             tracking.tracking_data = json.dumps(tracking_data)
#             tracking.save()
        
#         return JsonResponse({'success': True})
#     except Exception as e:
#         return JsonResponse({'error': str(e)}, status=400)4
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.shortcuts import get_object_or_404
import json
from datetime import datetime
from django.contrib.auth.decorators import login_required
from .models import Medication, Profile, MedicationTracking

@login_required
def medication_list(request):
    """Handle GET and POST requests for medications list"""
    # Get the user's profile
    profile = Profile.objects.get(user=request.user)
    
    if request.method == 'GET':
        # Get medications for this profile
        medications = Medication.objects.filter(profile=profile)
        
        # Convert to list of dictionaries for JSON response
        medications_list = []
        for med in medications:
            medications_list.append({
                'id': med.id,
                'name': med.name,
                'description': med.description,
                'refill_date': med.refill_date.isoformat() if med.refill_date else None,
                'frequency_per_day': med.frequency_per_day,
                'tablets_per_dose': float(med.tablets_per_dose),
                'created_at': med.created_at.isoformat()
            })
        
        return JsonResponse(medications_list, safe=False)
        
    elif request.method == 'POST':
        try:
            # Parse the request data
            data = json.loads(request.body)
            
            # Create new medication
            medication = Medication(
                profile=profile,
                name=data.get('name'),
                description=data.get('description', ''),
                frequency_per_day=data.get('frequency_per_day', 1),
                tablets_per_dose=data.get('tablets_per_dose', 1)
            )
            
            # Handle refill date (which can be null)
            if data.get('refill_date'):
                medication.refill_date = data.get('refill_date')
            
            medication.save()
            
            # Return the newly created medication
            return JsonResponse({
                'id': medication.id,
                'name': medication.name,
                'description': medication.description,
                'refill_date': medication.refill_date.isoformat() if medication.refill_date else None,
                'frequency_per_day': medication.frequency_per_day,
                'tablets_per_dose': float(medication.tablets_per_dose),
                'created_at': medication.created_at.isoformat()
            })
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@login_required
def medication_detail(request, medication_id):
    """Handle PUT and DELETE requests for individual medications"""
    # Get the medication
    profile = Profile.objects.get(user=request.user)
    medication = get_object_or_404(Medication, id=medication_id, profile=profile)
    
    if request.method == 'PUT':
        try:
            # Parse the request data
            data = json.loads(request.body)
            
            # Update medication fields
            medication.name = data.get('name', medication.name)
            medication.description = data.get('description', medication.description)
            medication.frequency_per_day = data.get('frequency_per_day', medication.frequency_per_day)
            medication.tablets_per_dose = data.get('tablets_per_dose', medication.tablets_per_dose)
            
            # Handle refill date (which can be null)
            if 'refill_date' in data:
                medication.refill_date = data.get('refill_date') or None
            
            medication.save()
            
            # Return the updated medication
            return JsonResponse({
                'id': medication.id,
                'name': medication.name,
                'description': medication.description,
                'refill_date': medication.refill_date.isoformat() if medication.refill_date else None,
                'frequency_per_day': medication.frequency_per_day,
                'tablets_per_dose': float(medication.tablets_per_dose),
                'created_at': medication.created_at.isoformat()
            })
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
            
    elif request.method == 'DELETE':
        try:
            # Delete the medication
            medication.delete()
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@login_required
def tracking_data(request, date):
    print("trying here")
    """Handle GET and POST requests for tracking data"""
    try:
        # Parse the date
        tracking_date = datetime.strptime(date, '%Y-%m-%d').date()
        
        # Get the user's profile
        profile = Profile.objects.get(user=request.user)
        
        if request.method == 'GET':
            print("THIS IS GET")
            # Get tracking data for this date
            tracking = MedicationTracking.objects.filter(
                # profile=profile,
                date=tracking_date
            ).first()
            
            if tracking:
                return JsonResponse({
                    'tracking': json.loads(tracking.tracking_data)
                })
            else:
                # Return empty tracking data
                return JsonResponse({
                    'tracking': {}
                })
                
        elif request.method == 'POST':
            # Get the request data
            print("THIS IS POST")
            data = json.loads(request.body)
            tracking_data = data.get('tracking', {})
            print("tracking data")
            # Save or update tracking data
            tracking, created = MedicationTracking.objects.get_or_create(
                # profile=profile,
                date=tracking_date,
                defaults={'tracking_data': json.dumps(tracking_data)}
            )
            
            if not created:
                tracking.tracking_data = json.dumps(tracking_data)
                tracking.save()
            
            return JsonResponse({'success': True})
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@login_required
def change_password_page(request):
    """
    View function to render the change password page
    """
    return render(request, 'changepw.html')
from django.shortcuts import render
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
import json
login_required
# @require_POST
def change_password(request):
    """
    View function to handle password change requests.
    Expects a JSON POST request with current_password and new_password.
    Returns a JSON response with success status and any errors.
    """
    try:
        # Parse the JSON data from request body
        data = json.loads(request.body)
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        # Validate that required fields are present
        if not current_password or not new_password:
            return JsonResponse({
                'success': False,
                'error': 'Current password and new password are required.'
            })
        
        # Check if the current password is correct
        if not request.user.check_password(current_password):
            return JsonResponse({
                'success': False,
                'error': 'Your current password is incorrect.'
            })
        
        # Validate the new password (you can add more validation as needed)
        if len(new_password) < 8:
            return JsonResponse({
                'success': False,
                'error': 'New password must be at least 8 characters long.'
            })
        
        # Set the new password
        request.user.set_password(new_password)
        request.user.save()
        
        # Update session to prevent user logout
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

# urls.py