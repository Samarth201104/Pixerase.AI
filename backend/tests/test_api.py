import io
import unittest
from unittest.mock import patch

from PIL import Image

from app import create_app
from app.config import Config


class TestConfig(Config):
    TESTING = True
    MAX_UPLOAD_SIZE = 1024 * 1024
    MAX_CONTENT_LENGTH = 3 * 1024 * 1024


class ImageApiTests(unittest.TestCase):
    def setUp(self):
        self.client = create_app(TestConfig).test_client()

    def image_upload(self):
        stream = io.BytesIO()
        Image.new("RGB", (8, 8), "white").save(stream, format="PNG")
        stream.seek(0)
        return stream

    def test_health_is_available_without_account_state(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["data"]["status"], "ok")

    def test_processing_routes_are_public(self):
        with patch("app.routes.background.process_background", side_effect=ValueError("probe")):
            response = self.client.post("/api/remove-background", data={"image": (self.image_upload(), "image.png")})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json["error"], "INVALID_REQUEST")

    def test_invalid_object_mode_returns_client_error(self):
        response = self.client.post("/api/remove-object", data={
            "image": (self.image_upload(), "image.png"), "mode": "invalid",
        })
        self.assertEqual(response.status_code, 400)

    def test_frontend_pages_are_served(self):
        for path in ("/", "/background", "/object"):
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)
                response.close()
