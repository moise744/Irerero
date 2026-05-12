import uuid
from datetime import date

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIRequestFactory

from auth_module.models import IreroUser, Role
from children.models import Centre, Child, ChildStatus
from children.serializers import ChildListSerializer, ChildDetailSerializer


class ChildPhotoUrlTests(TestCase):
    """Regression: web dashboard loads <img> from Vite origin; API must return absolute media URLs."""

    def setUp(self):
        sid = uuid.uuid4()
        did = uuid.uuid4()
        self.centre = Centre.objects.create(
            code="TST",
            centre_name="Test Centre",
            sector_id=sid,
            district_id=did,
            province="Kigali",
        )
        self.user = IreroUser.objects.create_user(
            username="mgr_photo_test",
            password="TestPass123!",
            full_name="Centre Manager",
            role=Role.CENTRE_MGR,
            centre_id=self.centre.id,
        )
        self.child = Child.objects.create(
            centre=self.centre,
            full_name="Test Child",
            date_of_birth=date(2022, 1, 15),
            sex="male",
            guardian_name="Guardian",
            guardian_phone="0788000000",
            home_village="Village",
            status=ChildStatus.ACTIVE,
        )
        self.child.photo.save(
            "face.jpg",
            SimpleUploadedFile("face.jpg", b"\xff\xd8\xff\xe0\x00\x10JFIF", content_type="image/jpeg"),
            save=True,
        )

    def test_list_serializer_photo_is_absolute(self):
        factory = APIRequestFactory()
        request = factory.get("/api/v1/children/")
        request.user = self.user
        data = ChildListSerializer(instance=self.child, context={"request": request}).data
        self.assertIsNotNone(data.get("photo"))
        self.assertTrue(str(data["photo"]).startswith("http://"))

    def test_detail_serializer_photo_is_absolute(self):
        factory = APIRequestFactory()
        request = factory.get(f"/api/v1/children/{self.child.id}/")
        request.user = self.user
        data = ChildDetailSerializer(instance=self.child, context={"request": request}).data
        self.assertIsNotNone(data.get("photo"))
        self.assertTrue(str(data["photo"]).startswith("http://"))
