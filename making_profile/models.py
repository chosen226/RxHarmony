from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import models
from django.utils import timezone
from datetime import datetime, time, timedelta
class Profile(models.Model):
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
        ('N', 'Prefer not to say'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True)
    blood_type = models.CharField(max_length=5, blank=True)
    allergies = models.TextField(blank=True)
    emergency_contact = models.CharField(max_length=200, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s profile"


class Condition(models.Model):
    profile = models.ForeignKey(Profile, related_name='medical_conditions', on_delete=models.CASCADE, null=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

# Signal to automatically create/update profile when user is created/updated
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()
class Medication(models.Model):
    profile = models.ForeignKey(Profile, related_name='medications', on_delete=models.CASCADE, null=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    refill_date = models.DateField(null=True, blank=True)
    frequency_per_day = models.PositiveSmallIntegerField(default=1)
    tablets_per_dose = models.DecimalField(max_digits=5, decimal_places=2, default=1)
    remaining_tablets = models.DecimalField(max_digits=5, decimal_places=2, default=30)  # Start with 30 tablets
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    

class MedicationTracking(models.Model):
    # profile = models.ForeignKey(Profile, related_name='medicationstracking', on_delete=models.CASCADE, null=True)
    
    profile = models.ForeignKey(Profile, related_name='medication_tracking', on_delete=models.CASCADE)
    date = models.DateField(default=timezone.now)
    tracking_data = models.TextField(default='{}')  # Default empty JSON object
    created_at = models.DateTimeField(default=timezone.now)  # Instead of auto_now_add=True for migration
    updated_at = models.DateTimeField(default=timezone.now)  # Instead of auto_now=True for migration

    
    