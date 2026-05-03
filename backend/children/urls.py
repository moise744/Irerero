from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("milestones",     views.MilestoneViewSet,     basename="milestones")
router.register("immunisations",  views.ImmunisationViewSet,  basename="immunisations")
router.register("",              views.ChildViewSet,          basename="children")

urlpatterns = [path("", include(router.urls))]
