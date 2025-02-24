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