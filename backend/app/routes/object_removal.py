import logging
import json

from flask import Blueprint, current_app, jsonify, request, send_file

from app.services.file_service import TemporaryWorkspace
from app.services.image_processing import remove_object as process_object
from app.utils.image_validation import ImageValidationError, read_image

logger = logging.getLogger(__name__)
object_bp = Blueprint("object_removal", __name__)
MAX_RECTANGLE_SELECTIONS = 20


def _error(message, code, status):
    return jsonify({"success": False, "message": message, "error": code}), status


@object_bp.post("/api/remove-object")
def remove_object():
    config = current_app.config
    try:
        image = read_image(request.files.get("image"), config["MAX_IMAGE_PIXELS"], config["MAX_UPLOAD_SIZE"])
        mode = request.form.get("mode", "rect")
        if mode not in {"rect", "brush", "mixed"}:
            raise ValueError("Choose rectangle or brush selection mode.")
        rect, canvas_size = None, None
        if mode in {"rect", "mixed"}:
            raw_rects = request.form.get("rects")
            if raw_rects:
                try:
                    values_list = json.loads(raw_rects)
                except json.JSONDecodeError as exc:
                    raise ValueError("The object selections are invalid. Please draw the boxes again.") from exc
                if not isinstance(values_list, list) or not values_list:
                    raise ValueError("Draw a rectangle around each object you want removed.")
                if len(values_list) > MAX_RECTANGLE_SELECTIONS:
                    raise ValueError(f"Select no more than {MAX_RECTANGLE_SELECTIONS} areas at once.")
            else:
                raw_rect = request.form.get("rect", "")
                legacy_values = [int(part) for part in raw_rect.split(",")] if raw_rect else []
                values_list = [legacy_values] if len(legacy_values) == 4 else []
            if not values_list and mode == "rect":
                raise ValueError("Draw a rectangle around each object you want removed.")
            rect = []
            for values in values_list:
                if not isinstance(values, list) or len(values) != 4:
                    raise ValueError("Each object selection must be a rectangle with four coordinates.")
                x, y, width, height = [int(part) for part in values]
                if width == 0 or height == 0:
                    raise ValueError("Each selection must have a visible width and height.")
                rect.append([min(x, x + width), min(y, y + height), abs(width), abs(height)])
            if rect:
                canvas_size = (int(request.form.get("canvas_w", "0")), int(request.form.get("canvas_h", "0")))
        workspace = TemporaryWorkspace()
        try:
            source, mask, result = workspace.path / "image.png", workspace.path / "mask.png", workspace.path / "result.png"
            image.save(source, format="PNG")
            mask_upload = request.files.get("mask")
            brush_mask = None
            if mask_upload:
                read_image(mask_upload, config["MAX_IMAGE_PIXELS"], config["MAX_UPLOAD_SIZE"]).convert("L").save(mask)
                brush_mask = mask
            erase_upload = request.files.get("erase_mask")
            erase_mask = None
            if erase_upload:
                erase_mask = workspace.path / "erase-mask.png"
                read_image(erase_upload, config["MAX_IMAGE_PIXELS"], config["MAX_UPLOAD_SIZE"]).convert("L").save(erase_mask)
            if mode == "brush" and not brush_mask:
                raise ValueError("Paint over at least one object before processing.")
            if mode == "mixed" and not brush_mask and not rect:
                raise ValueError("Mark at least one object with a rectangle or brush before processing.")
            process_object(source, brush_mask, erase_mask, result, mode, rect, canvas_size, config["OBJECT_MODEL_PATH"])
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
