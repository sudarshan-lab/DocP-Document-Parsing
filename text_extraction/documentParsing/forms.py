from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm
from django.core.validators import RegexValidator

class SignUpForm(UserCreationForm):
    email = forms.EmailField(required=True)
    first_name = forms.CharField(max_length=30, required=False)
    last_name = forms.CharField(max_length=30, required=False)
    username = forms.CharField(
        max_length=150,
        required=True,
        help_text='Alphanumerics and @/./+/-/_ only.',
        validators=[RegexValidator(regex='^[a-zA-Z0-9@.+-_]+$',
                                   message='Enter a valid username. This value may contain only letters, numbers, and @/./+/-/_ characters.')],
        error_messages={'required': 'Please enter a username.'}
    )

    class Meta:
        model = User
        fields = ('username', 'first_name', 'last_name', 'email', 'password1', 'password2',)
