from io import BytesIO

from PIL import Image, UnidentifiedImageError

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
ALLOWED_MIMES = {"image/jpeg", "image/png", "image/webp", "application/octet-stream"}


class ImageValidationError(ValueError):
    def __init__(self, message, code="INVALID_IMAGE", status=400):
        super().__init__(message)
        self.code = code
        self.status = status


def read_image(upload, max_pixels, max_bytes):
    if not upload or not upload.filename:
        raise ImageValidationError("Please choose an image to upload.", "MISSING_IMAGE")
    if upload.mimetype not in ALLOWED_MIMES:
        raise ImageValidationError("Please upload a valid JPG, PNG, or WebP image.", "UNSUPPORTED_FILE_TYPE")
    raw = upload.read()
    upload.stream.seek(0)
    if len(raw) > max_bytes:
        raise ImageValidationError("Your image is too large. Please choose a smaller image.", "FILE_TOO_LARGE", 413)
    try:
        with Image.open(BytesIO(raw)) as candidate:
            if candidate.format not in ALLOWED_FORMATS:
                raise ImageValidationError("Please upload a valid JPG, PNG, or WebP image.", "UNSUPPORTED_FILE_TYPE")
            if candidate.width < 1 or candidate.height < 1 or candidate.width * candidate.height > max_pixels:
                raise ImageValidationError("This image has too many pixels. Please choose a smaller image.", "IMAGE_DIMENSIONS")
            candidate.verify()
        with Image.open(BytesIO(raw)) as image:
            return image.convert("RGB")
    except ImageValidationError:
        raise
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ImageValidationError("Please upload a valid JPG, PNG, or WebP image.") from exc


def read_optional_background(upload, max_pixels, max_bytes):
    if not upload or not upload.filename:
        return None
    return read_image(upload, max_pixels, max_bytes)
