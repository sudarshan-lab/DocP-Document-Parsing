from rest_framework import serializers
from .models import Contract

class ContractSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contract
        fields = ['id', 'name', 'prompt', 'description', 'created_at', 'modified_at']
