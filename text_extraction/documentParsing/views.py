from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, authenticate
from .forms import SignUpForm
from django.contrib.auth import logout
from django.core.files.storage import FileSystemStorage
from .models import UploadedFile
from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_http_methods
from rest_framework import viewsets
import os
from .models import Contract
from .serializers import ContractSerializer
from django.views.decorators.csrf import csrf_exempt
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import views as auth_views
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
import json
from django.views.decorators.clickjacking import xframe_options_exempt
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

@xframe_options_exempt
@csrf_exempt
def home(request):
    context = {}
    if request.method == 'OPTIONS':
        # Prepare response for OPTIONS request
        response = HttpResponse()
        response['Access-Control-Allow-Origin'] = '*' 
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'  
        return response
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
@csrf_exempt 
def signup(request):
    if request.method == 'OPTIONS':
        # Prepare response for OPTIONS request
        response = JsonResponse({'detail': 'Options request successful'})
        response['Access-Control-Allow-Origin'] = '*' 
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type'  
        return response   
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
@csrf_exempt
def custom_logout(request):
    logout(request)
    return redirect('home')


@login_required
def view_history(request):
    uploaded_files = UploadedFile.objects.filter(user=request.user).order_by('-uploaded_at')
    return render(request, 'history.html', {'uploaded_files': uploaded_files})



# def upload(request):
#     if request.method == 'POST' and request.FILES['file']:
#         file = request.FILES['file']
#         fs = FileSystemStorage()
#         filename = fs.save(file.name, file)
#         uploaded_file_url = fs.url(filename)
#         UploadedFile.objects.create(file=filename)
#         # Add a success message
#         messages.success(request, 'Your file has been uploaded successfully!')
#         return redirect('upload')  # Redirect back to the same 'upload' page
#     return render(request, 'upload.html')
@csrf_exempt
def create_contract(request):
    if request.method == 'OPTIONS':
        response = HttpResponse()
        response['Access-Control-Allow-Origin'] = 'http://localhost:5173'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'X-CSRFToken, Content-Type'
        return response
    elif request.method == 'POST':
        try:
            data = json.loads(request.body.decode('utf-8'))
            contract = Contract.objects.create(
                name=data['name'], 
                prompt=data.get('prompt', ''), 
                description=data.get('description', '')
            )
            return JsonResponse({
                "id": contract.id, 
                "name": contract.name, 
                "prompt": contract.prompt, 
                "description": contract.description
            }, status=201)
        except (TypeError, ValueError, KeyError):
            return JsonResponse({"error": "Bad request"}, status=400)
    else:
        return HttpResponse(status=405)