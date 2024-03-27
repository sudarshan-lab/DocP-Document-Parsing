from django.db import models
from django.contrib.auth.models import User

class Contract(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255, unique=True) 
    prompt = models.TextField()
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.id}" 
class UploadedFile(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_files', null=True)
    file = models.FileField(upload_to='media/')
    extracted_text = models.TextField(blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    contract = models.ForeignKey(Contract, on_delete=models.SET_NULL, related_name='uploaded_files', null=True, blank=True)

    def __str__(self):
        return f'{self.file.name} uploaded by {self.user.username}'
  