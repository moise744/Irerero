from django.urls import path
from . import views
urlpatterns = [
    path("",        views.UserListCreateView.as_view(), name="user-list"),
    path("<uuid:pk>/", views.UserDetailView.as_view(), name="user-detail"),
    path("<uuid:pk>/wipe/", views.remote_wipe_view,    name="user-wipe"),
]
