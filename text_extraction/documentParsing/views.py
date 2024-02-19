from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, authenticate
from .forms import SignUpForm
from django.core.files.storage import FileSystemStorage
from .models import UploadedFile
from django.http import HttpResponse
import os
from .extract import extract_text_from_pdf

def py_path(win_path):
    python_path = "" # The result of this script.
    # Convert to ASCII list
    ascii_values_list = []
    for character in win_path:
        ascii_values_list.append(ord(character))
    # Replace all ASCII values for "\" (=92) with value for "/" (=47).
    for i in range(0, len(ascii_values_list)):
        if ascii_values_list[i] == 92:
            ascii_values_list[i] = 47
    path_py = "" # Convert ASCII list to string
    for val in ascii_values_list:
        path_py = path_py + chr(val)

    if path_py[-1] != "/": # Add "/" at end of path if needed.
        path_py = path_py + "/"
    path_py+='text_extraction'    
    return path_py

def home(request):
    context = {}
    if request.method == 'POST' and request.FILES.get('file'):
        file = request.FILES['file']
        fs = FileSystemStorage()
        filename = fs.save(file.name, file)
        uploaded_file_url = fs.url(filename)
        cur_dir=py_path(os.path.dirname(os.getcwd()))
        full_path=cur_dir+'/media/'+filename
        context['success_message'] = 'Your file has been uploaded successfully!'
        text=extract_text_from_pdf(full_path)
        context['uploaded_file_url']=uploaded_file_url
        context['extracted_text']=text
        if request.user.is_authenticated:
            UploadedFile.objects.create(
                    user=request.user,
                    file=file,
                    extracted_text=text
            )

    return render(request, 'home.html', context)
def signup(request):
    if request.method == 'POST':
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save()
            # Log the user in after signing up
            login(request, user)
            # Redirect to home or any other page
            return redirect('home')
    else:
        form = SignUpForm()
    return render(request, 'signup.html', {'form': form})