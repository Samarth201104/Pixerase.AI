from pathlib import Path
from PIL import Image

from app.services.model_manager import models


def remove_background(image, background, config):
    from app.models.background.background_removal import composite_foreground_with_bg, refine_mask, load_template_background
    from app.models.background.model_loader import predict_mask

    if background is None:
        template = None
        # Template names are basenames only; this prevents traversal outside the configured folder.
        if config.get("bg_template"):
            name = Path(config["bg_template"]).name
            template = load_template_background(name, str(config["template_folder"]))
            if template is None:
                raise ValueError("The selected background is unavailable.")
    else:
        template = background
    mask = predict_mask(models.background(config["model_path"]), image, device=models.device())
    return composite_foreground_with_bg(image, refine_mask(mask), template)


def remove_object(image_path, mask_path, erase_mask_path, output_path, mode, rect, canvas_size, model_path):
    import cv2
    import numpy as np
    from app.models.object.infer import grabcut_with_brush, grabcut_with_rects, run_migan_inference

    selection_masks = []
    if rect:
        if not canvas_size or canvas_size[0] <= 0 or canvas_size[1] <= 0:
            raise ValueError("Draw a selection around the object before processing.")
        rectangles = rect if isinstance(rect[0], (list, tuple)) else [rect]
        with Image.open(image_path) as image:
            image_width, image_height = image.size
        scale_x, scale_y = image_width / canvas_size[0], image_height / canvas_size[1]
        image_rectangles = []
        for x, y, width, height in rectangles:
            x1, y1 = int(x * scale_x), int(y * scale_y)
            x2, y2 = int((x + width) * scale_x), int((y + height) * scale_y)
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(image_width, x2), min(image_height, y2)
            if x2 <= x1 or y2 <= y1:
                continue
            image_rectangles.append([x1, y1, x2 - x1, y2 - y1])
        if not image_rectangles:
            raise ValueError("Select an area inside the image.")
        if image_rectangles:
            selection_masks.append(grabcut_with_rects(str(image_path), image_rectangles, output_path=str(Path(output_path).with_name("rect-mask.png"))))
    if mask_path:
        selection_masks.append(grabcut_with_brush(str(image_path), str(mask_path), output_path=str(Path(output_path).with_name("brush-mask.png"))))
    if not selection_masks:
        raise ValueError("Mark at least one object with a rectangle or brush before processing.")
    final_mask = str(Path(output_path).with_name("combined-mask.png"))
    combined = None
    for selection_path in selection_masks:
        current = cv2.imread(str(selection_path), cv2.IMREAD_GRAYSCALE)
        if current is None:
            raise ValueError("The marked object selection could not be processed. Please try again.")
        if combined is None:
            combined = current
        else:
            combined = cv2.bitwise_or(combined, current)
    if erase_mask_path:
        erase = cv2.imread(str(erase_mask_path), cv2.IMREAD_GRAYSCALE)
        if erase is None:
            raise ValueError("The eraser marks could not be processed. Please try again.")
        if erase.shape != combined.shape:
            erase = cv2.resize(erase, (combined.shape[1], combined.shape[0]), interpolation=cv2.INTER_NEAREST)
        combined[erase > 10] = 0
    if not np.any(combined):
        raise ValueError("Your selection is empty after erasing. Mark an object area and try again.")
    if not cv2.imwrite(final_mask, combined):
        raise ValueError("The object selection mask could not be saved. Please try again.")
    return run_migan_inference(models.object(model_path), str(image_path), final_mask, str(output_path), device=models.device())
