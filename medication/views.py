from django.shortcuts import render

# Create your views here.
import os
import json
import traceback
from datetime import datetime, timedelta, date

from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.views.decorators.http import require_POST

from making_profile.models import Profile ,Condition
from .models import Medication,  MedicationTracking
from django.views.decorators.csrf import csrf_exempt

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None




@csrf_exempt
@login_required
def medication_dashboard(request):
    #displayes the dashboard
    return render(request, 'dashboard.html')

@csrf_exempt
@login_required
def medication_list(request):

    try:
        profile = Profile.objects.get(user=request.user)
        # retrieves all medications for the user
        if request.method == 'GET':
            medications = Medication.objects.filter(profile=profile)
            # Convert medication objects to a list of dictionaries for JSON response
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
            # creates a new medication    
        elif request.method == 'POST':
            data = json.loads(request.body)
            
            refill_date = None
            if data.get('refill_date') and data.get('refill_date').strip():
                try:
                    refill_date = datetime.strptime(data.get('refill_date'), '%Y-%m-%d').date()
                except ValueError:
                    pass
            # Creates new medication record in database
            medication = Medication.objects.create(
                profile=profile,
                name=data.get('name', ''),
                description=data.get('description', ''),
                refill_date=refill_date,
                frequency_per_day=int(data.get('frequency_per_day', 1)),
                tablets_per_dose=float(data.get('tablets_per_dose', 1)),
                remaining_tablets=30
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
            return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    except Profile.DoesNotExist:
        return JsonResponse({'error': 'User profile not found'}, status=404)
    
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON in request body'}, status=400)
    
    except Exception as e:
        error_details = traceback.format_exc()
        print("Error in medication_list:", str(e))
        print(error_details)
        return JsonResponse({
            'error': str(e),
            'details': error_details
        }, status=400)

@csrf_exempt
@login_required
def medication_detail(request, medication_id):
    # Get the user's profile
    profile = Profile.objects.get(user=request.user)
       # Get the specific medication or return 404 if not found
    medication = get_object_or_404(Medication, id=medication_id, profile=profile)
    #update medication details
    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            
            medication.name = data.get('name', medication.name)
            medication.description = data.get('description', medication.description)
            medication.frequency_per_day = data.get('frequency_per_day', medication.frequency_per_day)
            medication.tablets_per_dose = data.get('tablets_per_dose', medication.tablets_per_dose)
            
            if 'remaining_tablets' in data:
                medication.remaining_tablets = data.get('remaining_tablets', medication.remaining_tablets)
            
            # Calculate refill date based on remaining tablets, frequency, and dose
            if medication.remaining_tablets and medication.frequency_per_day and medication.tablets_per_dose:
                tablets_per_day = medication.frequency_per_day * medication.tablets_per_dose
                if tablets_per_day > 0:
                    days_remaining = medication.remaining_tablets / tablets_per_day
                    today = date.today()
                    medication.refill_date = today + timedelta(days=days_remaining)
            
            
          
            medication.save()
              # Prepare response data with updated medication information
            response_data = {
                'id': medication.id,
                'name': medication.name,
                'description': medication.description,
                'frequency_per_day': medication.frequency_per_day,
                'tablets_per_dose': float(medication.tablets_per_dose),
                'remaining_tablets': float(medication.remaining_tablets),
                'created_at': medication.created_at.isoformat()
            }
            
            if medication.refill_date:
                response_data['refill_date'] = medication.refill_date.isoformat()
            else:
                response_data['refill_date'] = None
                
            return JsonResponse(response_data)
            
        except Exception as e:
            print(f"Error in medication_detail PUT: {str(e)}")
            print(traceback.format_exc())
            return JsonResponse({'error': str(e)}, status=400)
    
    elif request.method == 'DELETE':
        try:
            medication.delete()
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
@require_POST
def refill_medication(request, medication_id):
    #get medication based on id
    medication = get_object_or_404(Medication, id=medication_id, profile=request.user.profile)
    # caculate daily intake
    daily_usage = medication.frequency_per_day * medication.tablets_per_dose
    
    original_remaining = medication.remaining_tablets
    medication.remaining_tablets = original_remaining + 30
    # calculate new refill date based on how many tablets you take per day
    if daily_usage > 0:
        days_until_empty = medication.remaining_tablets / daily_usage
        medication.refill_date = datetime.now().date() + timedelta(days=int(days_until_empty))
    else:
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

@csrf_exempt
@login_required
def tracking_data(request, date):
    try:
        # convert date gotten into python date object
        tracking_date = datetime.strptime(date, '%Y-%m-%d').date()
        
        profile = Profile.objects.get(user=request.user)
        #retrieve medication tracking for a specific date
        if request.method == 'GET':
            tracking = MedicationTracking.objects.filter(
                profile=profile,
                date=tracking_date
            ).first()
             # Return tracking data if it exists, otherwise return empty object
            if tracking:
                return JsonResponse({
                    'tracking': json.loads(tracking.tracking_data)
                })
            else:
                return JsonResponse({
                    'tracking': {}
                })
            # create or update medication tracking for a specific date     
        elif request.method == 'POST':
            data = json.loads(request.body)
            tracking_data = data.get('tracking', {})
            previous_data = {}
            
            existing_tracking = MedicationTracking.objects.filter(
                profile=profile,
                date=tracking_date
            ).first()
            
            if existing_tracking:
                previous_data = json.loads(existing_tracking.tracking_data)
            
            for med_id, doses in tracking_data.items():
                try:
                    medication = Medication.objects.get(id=int(med_id), profile=profile)
                    
                    previous_doses = previous_data.get(med_id, [False] * len(doses))
                    
                    for i, (new_dose, old_dose) in enumerate(zip(doses, previous_doses)):
                        if new_dose and not old_dose:
                            medication.remaining_tablets = max(0, medication.remaining_tablets - medication.tablets_per_dose)
                    
                    medication.save()
                except Medication.DoesNotExist:
                    pass
                except Exception as e:
                    print(f"Error updating medication {med_id}: {str(e)}")
            
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
        error_details = traceback.format_exc()
        return JsonResponse({
            'error': str(e),
            'details': error_details
        }, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
@require_POST
def get_otc_recommendation(request):
     # Check if OpenAI module is available on the server
    if OpenAI is None:
        return JsonResponse({
            'success': False,
            'error': 'OpenAI module is not installed on the server.'
        }, status=500)
    
    try:
       # Parse JSON data from request body
        data = json.loads(request.body)
        
        ailment = data.get('ailment', '')
        age = data.get('age', 'Unknown')
        gender = data.get('gender', 'Unknown')
        allergies = data.get('allergies', 'None')
        medications = data.get('medications', 'None')
        conditions = data.get('conditions', 'None')
        blood_type = data.get('blood_type', 'Unknown')
        
        prompt = f"""
        I am a pharmacist in a retail pharmacy, provide advice on over-the-counter treatment options for the following case:
        
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
       # Set OpenAI API key
        api_key_recommend = os.environ.get("OPENAI_API_KEY_RECOMMEND")
        if not api_key:
           
            return JsonResponse({
                'success': False,
                'error': 'OpenAI API key not configured'
            }, status=500)
        
        client = OpenAI(api_key=api_key)
    
       # Send request to OpenAI API
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "I am a pharmacist in a retail pharmacy, provide advice on over-the-counter treatment options."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=800,
            temperature=0.7
        )
    
        
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

@csrf_exempt
@require_POST
def get_drug_discounts(request):
    if OpenAI is None:
        # Check if OpenAI module is available on the server
        return JsonResponse({
            'success': False,
            'error': 'OpenAI module is not installed on the server.'
        }, status=500)
    
    try:
        data = json.loads(request.body)
        
        insurance_type = data.get('insurance_type', '')
        drug_name = data.get('drug_name', '')
        
        try:
            profile = request.user.profile
            date_of_birth = profile.date_of_birth
            if date_of_birth:
                today = date.today()
                age = today.year - date_of_birth.year - ((today.month, today.day) < (date_of_birth.month, date_of_birth.day))
            else:
                age = "Unknown"
        except:
            age = "Unknown"
        
        prompt = f"""
        I am a pharmacist in a retail pharmacy, help this patient find the best available discounts for their medication:
        
        Patient Information:
        - Age: {age}
        - Insurance Type: {insurance_type}
        
        Medication:
        {drug_name}
        
        Please show:
        1. Manufacturer coupons or patient assistance programs if available
        2. GoodRx discount options
        3. Any other discount card programs
        4. Pharmacy-specific savings options (like Walmart's $4 program if applicable)
        
        For each option, include:
        - Estimated savings
        - How to access or use the discount
        - Any eligibility requirements
        - Links or websites where applicable (use placeholder URLs)
        
        Format your response in an easy-to-read manner with distinct sections for each discount type.
        """
        
        api_key_discount = os.environ.get("OPENAI_API_KEY_DISCOUNT")

        if not api_key:
            return JsonResponse({
                'success': False,
                'error': 'OpenAI API key not configured'
            }, status=500)
        
        client = OpenAI(api_key=api_key)
       
        try:
            print("About to make OpenAI API call...")
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "I am a pharmacist in a retail pharmacy, help this patient find the best available discounts for their medication."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,
                temperature=0.7
            )
            print("We got response from OpenAI API")
        except Exception as e:
            error_message = f"OpenAI API error: {str(e)}"
            print(error_message)
            import traceback
            print(f"Full traceback: {traceback.format_exc()}")
            return JsonResponse({
                'success': False,
                'error': error_message
            }, status=500)
            
        discounts = response.choices[0].message.content
        
        formatted_discounts = convert_discount_text_to_html(discounts)
        
        return JsonResponse({
            'success': True,
            'discounts': formatted_discounts
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@csrf_exempt
def convert_discount_text_to_html(text):
    #filtering the text recieved to make it more presentable
    sections = text.split('\n\n')
    
    html_output = ""
    
    for section in sections:
        if not section.strip():
            continue
            
        if section.startswith('#') or section.startswith('**'):
            title = section.replace('#', '').replace('**', '').strip()
            html_output += f'<div class="discount-option"><h4>{title}</h4>'
        
        elif "save" in section.lower() or "discount" in section.lower() or "%" in section:
            html_output += f'<div class="savings-badge">{section}</div>'
        
        else:
            html_output += f'<div class="discount-details">{section}</div></div>'
    
    html_output = html_output.replace('\n', '<br>')
    
    return html_output

@csrf_exempt
def pharmacy_finder(request):
     # Create context dictionary with page title
    context = {
        'page_title': 'Find Nearby Pharmacies',
    }
    return render(request, 'locator.html', context)

@csrf_exempt
def drug_discounts_page(request):
    context = {}
    
    return render(request, 'drug_discount.html', context)

@csrf_exempt
@login_required
def otc_prescription_view(request):
    context = {
        'page_title': 'Over the Counter Prescription',
        'active_tab': 'otc'
    }
    
    return render(request, 'get_medication.html', context)