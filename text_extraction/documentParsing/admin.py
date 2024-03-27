from django.contrib import admin
from .models import UploadedFile, Contract
# Register your models here.
admin.site.register(UploadedFile)
admin.site.register(Contract)
