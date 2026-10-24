# API

All API routes are public. The backend accepts multipart image uploads and returns generated PNG files directly. It retains no user records or images after a response closes.

## Health

`GET /api/health` returns JSON indicating that the API process is available.

## Background removal

`POST /api/remove-background`

- Required: `image` (JPEG, PNG, or WebP)
- Optional: `background` (uploaded replacement background)
- Optional: `bg_template` (bundled background template name)
- Returns: `image/png`

## Object removal

`POST /api/remove-object`

- Required: `image`
- Rectangle mode: `mode=rect`, `rect=x,y,width,height`, `canvas_w`, and `canvas_h`
- Brush mode: `mode=brush` and a grayscale `mask` upload
- Returns: `image/png`
