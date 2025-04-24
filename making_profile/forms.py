# forms.py
from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from .models import Profile, Condition
from medication.models import Medication

class UserRegistrationForm(UserCreationForm):
    email = forms.EmailField(required=True)

    class Meta:
        model = User
        fields = ('email', 'password1', 'password2')

    def save(self, commit=True):
        user = super().save(commit=False)
        user.username = self.cleaned_data['email']  # Using email as username
        user.email = self.cleaned_data['email']
        if commit:
            user.save()
        return user

class MedicationForm(forms.ModelForm):
    class Meta:
        model = Medication
        fields = ['name', 'description']

class ConditionForm(forms.ModelForm):
    class Meta:
        model = Condition
        fields = ['name', 'description']

class ProfileForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields = [
            'date_of_birth',
            'gender',
            'blood_type',
            'allergies',
            'emergency_contact',
            'emergency_contact_phone',
        ]
        widgets = {
            'date_of_birth': forms.DateInput(attrs={'type': 'date'}),
            'allergies': forms.Textarea(attrs={'rows': 3}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Make all fields not required since we want to allow partial profile completion
        for field in self.fields:
            self.fields[field].required = False
from django import forms
from .models import Medication

class MedicationForm(forms.ModelForm):
    class Meta:
        model = Medication
        fields = ['name', 'description', 'refill_date', 'frequency_per_day', 'tablets_per_dose']
        widgets = {
            'refill_date': forms.DateInput(attrs={'type': 'date'}),
            'frequency_per_day': forms.NumberInput(attrs={'min': 1, 'max': 10}),
            'tablets_per_dose': forms.NumberInput(attrs={'min': 0.25, 'step': 0.25}),
        }