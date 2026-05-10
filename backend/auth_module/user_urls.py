from django.urls import path
from . import views
urlpatterns = [
    path("",        views.UserListCreateView.as_view(), name="user-list"),
    path("centre-staff/", views.CentreStaffView.as_view(), name="centre-staff-list"),
    path("centre-staff/<uuid:pk>/", views.CentreStaffDetailView.as_view(), name="centre-staff-detail"),
    path("<uuid:pk>/", views.UserDetailView.as_view(), name="user-detail"),
    path("<uuid:pk>/wipe/", views.remote_wipe_view,    name="user-wipe"),
    path("<uuid:pk>/reset-password/", views.AdminResetPasswordView.as_view(), name="user-reset-password"),
]
