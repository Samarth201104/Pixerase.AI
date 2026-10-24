import logging

from flask import Blueprint, current_app, jsonify, request, send_file

from app.image_validation import ImageValidationError, read_image, read_optional_background
from app.services.file_service import TemporaryWorkspace
from app.services.image_processing import remove_background as process_background

logger = logging.getLogger(__name__)
background_bp = Blueprint("background", __name__)


def _error(message, code, status):
    return jsonify({"success": False, "message": message, "error": code}), status


@background_bp.post("/api/remove-background")
def remove_background():
    config = current_app.config
    try:
        image = read_image(request.files.get("image"), config["MAX_IMAGE_PIXELS"], config["MAX_UPLOAD_SIZE"])
        background = read_optional_background(request.files.get("background"), config["MAX_IMAGE_PIXELS"], config["MAX_UPLOAD_SIZE"])
        workspace = TemporaryWorkspace()
        try:
            result = process_background(image, background, {
                "bg_template": request.form.get("bg_template"),
                "template_folder": config["TEMPLATE_BACKGROUND_PATH"],
                "model_path": config["BACKGROUND_MODEL_PATH"],
            })
            result_path = workspace.path / "result.png"
            result.save(result_path, format="PNG", optimize=True)
            return workspace.attach(send_file(result_path, mimetype="image/png", download_name="background-removed.png"))
        except Exception:
            workspace.cleanup()
            raise
    except ImageValidationError as exc:
        return _error(str(exc), exc.code, exc.status)
    except ValueError as exc:
        return _error(str(exc), "INVALID_REQUEST", 400)
    except FileNotFoundError:
        logger.exception("A background model file is missing")
        return _error("The image processing model is not configured on this server.", "MODEL_UNAVAILABLE", 503)
