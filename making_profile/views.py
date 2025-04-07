import os
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
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.shortcuts import get_object_or_404
from datetime import datetime, timedelta
from .models import Medication
@require_POST
def refill_medication(request, medication_id):
    medication = get_object_or_404(Medication, id=medication_id, profile=request.user.profile)
    
    # Calculate how many tablets the user takes per day
    daily_usage = medication.frequency_per_day * medication.tablets_per_dose
    
    # Add 30 tablets to the current remaining amount
    original_remaining = medication.remaining_tablets
    medication.remaining_tablets = original_remaining + 30
    
    # Calculate when they will run out based on daily usage
    if daily_usage > 0:
        days_until_empty = medication.remaining_tablets / daily_usage
        medication.refill_date = datetime.now().date() + timedelta(days=int(days_until_empty))
    else:
        # If daily usage is somehow 0, default to 30 days
        medication.refill_date = datetime.now().date() + timedelta(days=30)
    
    medication.save()
    
    return JsonResponse({
        'success': True,
        'message': 'Medication refilled successfully',
        'medication': {
            'id': medication.id,
            'name': medication.name,
            'remaining_tablets': medication.remaining_tablets,
            'refill_date': medication.refill_date.strftime('%Y-%m-%d')
        }
    })
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
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
import json
from django.views.decorators.csrf import csrf_exempt
from .models import Profile, Condition

@login_required
@require_http_methods(["POST"])
def profile_update_api(request):
    """
    API endpoint for updating only the user profile data without affecting medications
    """
    try:
        # Get the current user's profile
        profile = request.user.profile
        
        # Parse the JSON data from the request
        data = json.loads(request.body)
        
        # Update the profile fields if provided in the request
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
        
        # Save the profile changes
        profile.save()
        
        # Handle conditions if included in the request
        if 'conditions' in data and isinstance(data['conditions'], list):
            # Get current conditions
            current_conditions = list(profile.medical_conditions.values_list('name', flat=True))
            
            # Identify conditions to add and remove
            conditions_to_add = [c for c in data['conditions'] if c not in current_conditions]
            conditions_to_remove = [c for c in current_conditions if c not in data['conditions']]
            
            # Remove conditions that are no longer in the list
            if conditions_to_remove:
                profile.medical_conditions.filter(name__in=conditions_to_remove).delete()
            
            # Add new conditions
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
        # Log the error for debugging
        print(f"Error in profile_update_api: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
@login_required
@require_http_methods(["GET"])
def profile_api(request):
    """API endpoint for fetching user profile data based on your specific models"""
    try:
        profile = request.user.profile  # Access the profile via the OneToOneField
        
        # Get medical conditions using the related_name you defined
        conditions = []
        try:
            # Using the 'medical_conditions' related_name from your model
            conditions = list(profile.medical_conditions.all().values('id', 'name', 'description'))
        except Exception as condition_error:
            print(f"Error fetching conditions: {str(condition_error)}")
        
        # Format the profile data as a dictionary
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
        # Log the error for debugging
        print(f"Error in profile_api: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

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
    
    return render(request, 'dashboard.html')


from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.shortcuts import get_object_or_404
import json
from datetime import datetime
from django.contrib.auth.decorators import login_required
from .models import Medication, Profile, MedicationTracking  # Assuming you have a MedicationTracking model

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.shortcuts import get_object_or_404
import json
from datetime import datetime
from django.contrib.auth.decorators import login_required
from .models import Medication, Profile, MedicationTracking
from openai import OpenAI

# @csrf_protect
@require_POST
def get_otc_recommendation(request):
    """API endpoint to get over-the-counter medication recommendations from OpenAI"""
    if OpenAI is None:
        return JsonResponse({
            'success': False,
            'error': 'OpenAI module is not installed on the server.'
        }, status=500)
    
    try:
        print("here1")
        # Get data from request
        data = json.loads(request.body)
        
        # Extract user information
        ailment = data.get('ailment', '')
        age = data.get('age', 'Unknown')
        gender = data.get('gender', 'Unknown')
        allergies = data.get('allergies', 'None')
        medications = data.get('medications', 'None')
        conditions = data.get('conditions', 'None')
        blood_type = data.get('blood_type', 'Unknown')
        
        # Construct prompt for OpenAI
        prompt = f"""
        As a healthcare assistant, provide advice on over-the-counter treatment options for the following case:
        
        Patient Information:
        - Age: {age}
        - Gender: {gender}
        - Blood Type: {blood_type}
        - Known Allergies: {allergies}
        - Current Medications: {medications}
        - Existing Medical Conditions: {conditions}
        
        Current Ailment:
        {ailment}
        
        Please suggest over-the-counter medications or treatments that would be appropriate for this patient, including:
        1. Recommended OTC medication names
        2. Dosage instructions
        3. How long to take the medication
        4. Any warnings or potential interactions with their current medications
        5. When they should see a doctor instead of self-treating
        
        Format your response in an easy-to-read manner.
        do nout use full sentences, make it like 
        name of medicine
        and dose
        and note
        keep that the format
        if you must add full sentences add it in note, keep it very brief though
        """
        print("here2")
        
        # Get API key
        api_key = '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'
        if not api_key:
            # For testing, you can hardcode your API key here, but it's not recommended for production
            # api_key = "your-api-key"
            print("not api key")
            # For now, return an error if no API key is found
            return JsonResponse({
                'success': False,
                'error': 'OpenAI API key not configured'
            }, status=500)
        
        # Create OpenAI client with updated API
        client = OpenAI(api_key=api_key)
        
        # Call OpenAI API with updated syntax for OpenAI v1.x
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",  # or your preferred model
            messages=[
                {"role": "system", "content": "You are a helpful healthcare assistant providing over-the-counter medication advice."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=800,
            temperature=0.7
        )
        print("hereee")
        
        # Extract recommendation from response
        recommendation = response.choices[0].message.content
        
        return JsonResponse({
            'success': True,
            'recommendation': recommendation
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
    
@login_required
def otc_prescription_view(request):
    """
    View function for the Over the Counter Prescription page.
    This page allows users to get AI-based recommendations for OTC medications.
    """
    # You can pass any context data needed by the template
    context = {
        'page_title': 'Over the Counter Prescription',
        'active_tab': 'otc'  # For highlighting the active tab in navigation
    }
    
    # Render the template with the provided context
    return render(request, 'get_medication.html', context)
def pharmacy_finder(request):
    """
    View function for the pharmacy finder page.
    
    This view simply renders the pharmacy_finder.html template.
    No additional context is needed as the pharmacy finding functionality
    is handled by JavaScript using the Google Maps API.
    """
    # You could add context data here if needed in the future
    context = {
        'page_title': 'Find Nearby Pharmacies',
    }
    return render(request, 'locator.html', context)
@login_required
# @login_required
def medication_list(request):
    """Handle GET and POST requests for medications"""
    try:
        profile = Profile.objects.get(user=request.user)
        
        if request.method == 'GET':
            # Get all medications for this user
            medications = Medication.objects.filter(profile=profile)
            
            med_list = []
            for med in medications:
                med_list.append({
                    'id': med.id,
                    'name': med.name,
                    'description': med.description,
                    'refill_date': med.refill_date.isoformat() if med.refill_date else None,
                    'frequency_per_day': med.frequency_per_day,
                    'tablets_per_dose': float(med.tablets_per_dose),
                    'remaining_tablets': float(med.remaining_tablets)
                })
            
            return JsonResponse({'medications': med_list})
                
        elif request.method == 'POST':
            # Create new medication
            data = json.loads(request.body)
            
            # Process refill date
            refill_date = None
            if data.get('refill_date') and data.get('refill_date').strip():
                try:
                    refill_date = datetime.strptime(data.get('refill_date'), '%Y-%m-%d').date()
                except ValueError:
                    # If date format is incorrect, set to None
                    pass
            
            # Create the medication object
            medication = Medication.objects.create(
                profile=profile,
                name=data.get('name', ''),
                description=data.get('description', ''),
                refill_date=refill_date,
                frequency_per_day=int(data.get('frequency_per_day', 1)),
                tablets_per_dose=float(data.get('tablets_per_dose', 1)),
                remaining_tablets=30  # Default to 30 tablets
            )
            
            return JsonResponse({
                'id': medication.id,
                'name': medication.name,
                'description': medication.description,
                'refill_date': medication.refill_date.isoformat() if medication.refill_date else None,
                'frequency_per_day': medication.frequency_per_day,
                'tablets_per_dose': float(medication.tablets_per_dose),
                'remaining_tablets': float(medication.remaining_tablets)
            })
        else:
            # Handle other HTTP methods
            return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    except Profile.DoesNotExist:
        return JsonResponse({'error': 'User profile not found'}, status=404)
    
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON in request body'}, status=400)
    
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print("Error in medication_list:", str(e))
        print(error_details)
        return JsonResponse({
            'error': str(e),
            'details': error_details
        }, status=400)
# @login_required
# def medication_detail(request, medication_id):
#     """Handle PUT and DELETE requests for individual medications"""
#     # Get the medication
#     profile = Profile.objects.get(user=request.user)
#     medication = get_object_or_404(Medication, id=medication_id, profile=profile)
    
#     if request.method == 'PUT':
#         try:
#             # Parse the request data
#             data = json.loads(request.body)
            
#             # Update medication fields
#             medication.name = data.get('name', medication.name)
#             medication.description = data.get('description', medication.description)
#             medication.frequency_per_day = data.get('frequency_per_day', medication.frequency_per_day)
#             medication.tablets_per_dose = data.get('tablets_per_dose', medication.tablets_per_dose)
            
#             # Handle refill date (which can be null)
#             if 'refill_date' in data:
#                 medication.refill_date = data.get('refill_date') or None
            
#             medication.save()
            
#             # Return the updated medication
#             return JsonResponse({
#                 'id': medication.id,
#                 'name': medication.name,
#                 'description': medication.description,
#                 'refill_date': medication.refill_date.isoformat() if medication.refill_date else None,
#                 'frequency_per_day': medication.frequency_per_day,
#                 'tablets_per_dose': float(medication.tablets_per_dose),
#                 'created_at': medication.created_at.isoformat()
#             })
#         except Exception as e:
#             return JsonResponse({'error': str(e)}, status=400)
            
#     elif request.method == 'DELETE':
#         try:
#             # Delete the medication
#             medication.delete()
#             return JsonResponse({'success': True})
#         except Exception as e:
#             return JsonResponse({'error': str(e)}, status=400)
    
#     return JsonResponse({'error': 'Method not allowed'}, status=405)
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
            
            # Add missing field from the tabular UI
            if 'remaining_tablets' in data:
                medication.remaining_tablets = data.get('remaining_tablets', medication.remaining_tablets)
            
            # Handle refill date (which can be null)
            if 'refill_date' in data:
                refill_date = data.get('refill_date')
                if refill_date and isinstance(refill_date, str) and refill_date.strip():
                    # Parse the date string into a Python date object
                    from datetime import datetime
                    try:
                        # Try ISO format first (YYYY-MM-DD)
                        medication.refill_date = datetime.strptime(refill_date, '%Y-%m-%d').date()
                    except ValueError:
                        try:
                            # Try alternate format (MM/DD/YYYY)
                            medication.refill_date = datetime.strptime(refill_date, '%m/%d/%Y').date()
                        except ValueError:
                            # If all parsing fails, set to None
                            medication.refill_date = None
                else:
                    medication.refill_date = None
            
            medication.save()
            
            # Return the updated medication with proper handling of date serialization
            response_data = {
                'id': medication.id,
                'name': medication.name,
                'description': medication.description,
                'frequency_per_day': medication.frequency_per_day,
                'tablets_per_dose': float(medication.tablets_per_dose),
                'remaining_tablets': float(medication.remaining_tablets),
                'created_at': medication.created_at.isoformat()
            }
            
            # Safely add refill_date to response if it exists
            if medication.refill_date:
                response_data['refill_date'] = medication.refill_date.isoformat()
            else:
                response_data['refill_date'] = None
                
            return JsonResponse(response_data)
            
        except Exception as e:
            import traceback
            print(f"Error in medication_detail PUT: {str(e)}")
            print(traceback.format_exc())  # Print full traceback for debugging
            return JsonResponse({'error': str(e)}, status=400)
    
    elif request.method == 'DELETE':
        try:
            # Delete the medication
            medication.delete()
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)
# @login_required
@login_required
def tracking_data(request, date):
    """Handle GET and POST requests for tracking data"""
    try:
        # Parse the date
        tracking_date = datetime.strptime(date, '%Y-%m-%d').date()
        
        # Get the user's profile
        profile = Profile.objects.get(user=request.user)
        
        if request.method == 'GET':
            # Get tracking data for this date
            tracking = MedicationTracking.objects.filter(
                profile=profile,
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
            data = json.loads(request.body)
            tracking_data = data.get('tracking', {})
            previous_data = {}
            
            # Get previous tracking data if it exists
            existing_tracking = MedicationTracking.objects.filter(
                profile=profile,
                date=tracking_date
            ).first()
            
            if existing_tracking:
                previous_data = json.loads(existing_tracking.tracking_data)
            
            # Update medication tablet counts based on tracking changes
            for med_id, doses in tracking_data.items():
                try:
                    medication = Medication.objects.get(id=int(med_id), profile=profile)
                    
                    # Get previous doses for this medication if they exist
                    previous_doses = previous_data.get(med_id, [False] * len(doses))
                    
                    # Count new doses taken
                    for i, (new_dose, old_dose) in enumerate(zip(doses, previous_doses)):
                        if new_dose and not old_dose:  # If dose was newly checked
                            # Reduce the remaining tablets by tablets_per_dose
                            medication.remaining_tablets = max(0, medication.remaining_tablets - medication.tablets_per_dose)
                    
                    medication.save()
                except Medication.DoesNotExist:
                    pass  # Ignore if medication doesn't exist
                except Exception as e:
                    print(f"Error updating medication {med_id}: {str(e)}")
            
            # Save or update tracking data
            tracking, created = MedicationTracking.objects.get_or_create(
                profile=profile,
                date=tracking_date,
                defaults={'tracking_data': json.dumps(tracking_data)}
            )
            
            if not created:
                tracking.tracking_data = json.dumps(tracking_data)
                tracking.save()
            
            return JsonResponse({'success': True})
    
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        return JsonResponse({
            'error': str(e),
            'details': error_details
        }, status=400)
    
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