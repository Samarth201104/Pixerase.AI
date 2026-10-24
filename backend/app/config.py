import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def _path_setting(name, default):
    path = Path(os.getenv(name, str(default)))
    return path if path.is_absolute() else ROOT / path


class Config:
    FRONTEND_PATH = ROOT / "frontend"
    MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_SIZE", str(25 * 1024 * 1024)))
    MAX_CONTENT_LENGTH = MAX_UPLOAD_SIZE * 3 + 1024 * 1024
    MAX_IMAGE_PIXELS = int(os.getenv("MAX_IMAGE_PIXELS", "12000000"))
    BACKGROUND_MODEL_PATH = _path_setting("BACKGROUND_MODEL_PATH", ROOT / "backend/app/models/background/models/u2net.pth")
    OBJECT_MODEL_PATH = _path_setting("OBJECT_MODEL_PATH", ROOT / "backend/app/models/object/models/migan_512_places2.pt")
    TEMPLATE_BACKGROUND_PATH = _path_setting("TEMPLATE_BACKGROUND_PATH", ROOT / "frontend/assets/backgrounds")
    DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",") if origin.strip()]
