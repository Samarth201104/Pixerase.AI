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


def remove_object(image_path, mask_path, output_path, mode, rect, canvas_size, model_path):
    from app.models.object.infer import grabcut_with_brush, grabcut_with_rects, run_migan_inference

    if mode == "brush":
        if not mask_path:
            raise ValueError("Paint over the object before processing.")
        final_mask = grabcut_with_brush(str(image_path), str(mask_path))
    else:
        if not rect or not canvas_size or canvas_size[0] <= 0 or canvas_size[1] <= 0:
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
        final_mask = grabcut_with_rects(str(image_path), image_rectangles)
    return run_migan_inference(models.object(model_path), str(image_path), final_mask, str(output_path), device=models.device())
