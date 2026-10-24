import logging

from flask import Blueprint, current_app, jsonify, request, send_file

from app.image_validation import ImageValidationError, read_image
from app.services.file_service import TemporaryWorkspace
from app.services.image_processing import remove_object as process_object

logger = logging.getLogger(__name__)
object_bp = Blueprint("object_removal", __name__)


def _error(message, code, status):
    return jsonify({"success": False, "message": message, "error": code}), status


@object_bp.post("/api/remove-object")
def remove_object():
    config = current_app.config
    try:
        image = read_image(request.files.get("image"), config["MAX_IMAGE_PIXELS"], config["MAX_UPLOAD_SIZE"])
        mode = request.form.get("mode", "rect")
        if mode not in {"rect", "brush"}:
            raise ValueError("Choose rectangle or brush selection mode.")
        rect, canvas_size = None, None
        if mode == "rect":
            values = [int(part) for part in request.form.get("rect", "").split(",")]
            if len(values) != 4:
                raise ValueError("Draw a selection around the object before processing.")
            x, y, width, height = values
            rect = [min(x, x + width), min(y, y + height), abs(width), abs(height)]
            canvas_size = (int(request.form.get("canvas_w", "0")), int(request.form.get("canvas_h", "0")))
        workspace = TemporaryWorkspace()
        try:
            source, mask, result = workspace.path / "image.png", workspace.path / "mask.png", workspace.path / "result.png"
            image.save(source, format="PNG")
            mask_upload = request.files.get("mask")
            if mode == "brush":
                read_image(mask_upload, config["MAX_IMAGE_PIXELS"], config["MAX_UPLOAD_SIZE"]).convert("L").save(mask)
            process_object(source, mask if mode == "brush" else None, result, mode, rect, canvas_size, config["OBJECT_MODEL_PATH"])
            return workspace.attach(send_file(result, mimetype="image/png", download_name="object-removed.png"))
        except Exception:
            workspace.cleanup()
            raise
    except ImageValidationError as exc:
        return _error(str(exc), exc.code, exc.status)
    except (ValueError, TypeError, OverflowError) as exc:
        return _error(str(exc), "INVALID_REQUEST", 400)
    except FileNotFoundError:
        logger.exception("An object model file is missing")
        return _error("The image processing model is not configured on this server.", "MODEL_UNAVAILABLE", 503)
