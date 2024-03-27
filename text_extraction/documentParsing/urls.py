from django.urls import path
from . import views
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth import views as auth_views
from django.views.decorators.csrf import csrf_exempt
from .views import set_csrf_token

urlpatterns = [
    path('set-csrf/', set_csrf_token, name='set-csrf'),
    path('', views.home, name='home'),
    path('history/', views.view_history, name='history'),
    path('contracts/', views.list_contracts, name='contracts'),
    # path('login/', auth_views.LoginView.as_view(template_name='login.html'), name='login'),
    # path('login/', csrf_exempt(auth_views.LoginView.as_view(template_name='login.html')), name='login'),
    path('login/', views.exempted_login_view, name='login'),
    path('adminlogin/', views.exempted_admin_login_view, name='adminlogin'),

    path('logout/', views.custom_logout, name='logout'),
    path('signup/', views.signup, name='signup'),
    path('api/auth/status', views.auth_status, name='auth-status'),
    path('contracts/create/', views.create_contract, name='create_contract'),
    path('contracts/update/<int:contract_id>/', views.update_contract, name='update_contract'),
    path('contracts/delete/<int:contract_id>/', views.delete_contract, name='delete_contract'),
    # path('upload/', views.upload, name='upload'),
]+static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)