from django.db import models
from django.utils import timezone
from making_profile.models import Profile

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
    profile = models.ForeignKey(Profile, related_name='medication_tracking', on_delete=models.CASCADE)
    date = models.DateField(default=timezone.now)
    tracking_data = models.TextField(default='{}')  # Default empty JSON object
    created_at = models.DateTimeField(default=timezone.now)  # Instead of auto_now_add=True for migration
    updated_at = models.DateTimeField(default=timezone.now)  # Instead of auto_now=True for migration