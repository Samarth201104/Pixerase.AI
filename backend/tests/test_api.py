import io
import unittest
from unittest.mock import patch

from flask import Response
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

    def test_object_route_passes_all_rectangle_selections(self):
        def write_result(_source, _mask, _erase_mask, output, _mode, _rectangles, _canvas_size, _model):
            Image.new("RGB", (8, 8), "white").save(output)

        with patch("app.routes.object_removal.process_object", side_effect=write_result) as process, patch(
            "app.routes.object_removal.send_file", return_value=Response(b"processed")
        ):
            response = self.client.post("/api/remove-object", data={
                "image": (self.image_upload(), "image.png"),
                "mode": "rect",
                "rects": "[[1, 2, 3, 4], [5, 6, 7, 8]]",
                "canvas_w": "8",
                "canvas_h": "8",
            }, buffered=True)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(process.call_args.args[4], [[1, 2, 3, 4], [5, 6, 7, 8]])
            self.assertTrue(response.get_data())
            response.close()

    def test_object_route_passes_combined_rectangle_brush_and_eraser_inputs(self):
        def write_result(_source, _mask, _erase_mask, output, _mode, _rectangles, _canvas_size, _model):
            Image.new("RGB", (8, 8), "white").save(output)

        with patch("app.routes.object_removal.process_object", side_effect=write_result) as process, patch(
            "app.routes.object_removal.send_file", return_value=Response(b"processed")
        ):
            response = self.client.post("/api/remove-object", data={
                "image": (self.image_upload(), "image.png"),
                "mode": "mixed",
                "rects": "[[1, 2, 3, 4]]",
                "canvas_w": "8",
                "canvas_h": "8",
                "mask": (self.image_upload(), "mask.png"),
                "erase_mask": (self.image_upload(), "erase-mask.png"),
            }, buffered=True)
            self.assertEqual(response.status_code, 200, response.get_data(as_text=True))
            args = process.call_args.args
            self.assertIsNotNone(args[1])
            self.assertIsNotNone(args[2])
            self.assertEqual(args[4], "mixed")
            self.assertEqual(args[5], [[1, 2, 3, 4]])
            response.close()

    def test_frontend_pages_are_served(self):
        for path in ("/", "/background", "/object"):
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)
                response.close()
