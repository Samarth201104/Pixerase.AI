# Pixerase.AI

Pixerase.AI is a stateless image editing app with two tools: U²-Net background removal and MI-GAN object removal. The frontend is plain HTML, CSS, and JavaScript; the backend is a Flask image API. Image requests are processed temporarily and the app stores no identity or image history.

## Project layout

```text
backend/
  app/
    routes/                 Health, background, and object API endpoints
    services/               Image orchestration, model lifecycle, temporary files
    models/                 Preserved U²-Net and MI-GAN code and weights
    utils/                  Upload validation
  tests/
  requirements.txt
  run.py
frontend/
  index.html
  background.html
  object.html
  css/
  js/
  assets/
docs/
.env.example
```

## Local development

Use Python 3.10 and install the backend dependencies:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run.py
```

The API is available at `http://localhost:5000`. In a second terminal from the repository root, run `python -m http.server 8000 --directory frontend`, then open `http://localhost:8000`. Set `frontend/js/config.js` to `http://localhost:5000` for this local setup. If you serve the frontend from Flask, use `/index.html`, `/background.html`, and `/object.html` for pages.

The original model weight files remain under `backend/app/models/background/models/u2net.pth` and `backend/app/models/object/models/migan_512_places2.pt`. First inference loads each model into memory and may take time; CPU inference can be slow and memory intensive.

## API

- `GET /api/health` — process health check.
- `POST /api/remove-background` — multipart `image`, optionally `background` or `bg_template`; returns a PNG.
- `POST /api/remove-object` — multipart `image` and either `mode=rect` plus `rect`, `canvas_w`, `canvas_h`, or `mode=brush` plus `mask`; returns a PNG.

All image endpoints are public and stateless. Inputs, masks, and result files are stored in a unique system temporary directory during the request and removed when the response closes. The frontend holds preview blobs in memory only. Uploads are capped at 10 MB and 12 million pixels by default.

## Configuration

`.env.example` documents the supported local and Render environment settings. Export them in your shell for local runs; configure the same values in the Render dashboard for deployment. Supported settings:

| Variable | Purpose | Default |
| --- | --- | --- |
| `FLASK_DEBUG` | Enable Flask debug mode for local development | `false` |
| `MAX_UPLOAD_SIZE` | Maximum bytes for each uploaded image | `10485760` |
| `MAX_IMAGE_PIXELS` | Maximum decoded image pixel count | `12000000` |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins | `*` |
| `BACKGROUND_MODEL_PATH` | Optional U²-Net weights override | bundled model path |
| `OBJECT_MODEL_PATH` | Optional MI-GAN weights override | bundled model path |

Do not add secrets to the static frontend. `frontend/js/config.js` contains the public backend API origin and should be set before publishing the frontend.

## Deploy to Vercel and Render

### Frontend on Vercel

Create a Vercel project with the repository's `frontend/` directory as its **Root Directory**. The included `frontend/vercel.json` maps `/`, `/background`, and `/object` to the three static HTML pages. Set the API origin in `frontend/js/config.js` to the public HTTPS URL of the Render backend (no trailing slash), then deploy.

### Backend on Render

Create a native Python web service from the repository and use `backend/` as its **Root Directory**. Install with `pip install -r requirements.txt`; start with `gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 2 --timeout 180 run:app`. Set `CORS_ORIGINS` to the exact Vercel origin and keep `FLASK_DEBUG=false`. `render.yaml` provides these settings as a Blueprint configuration.

The Python/PyTorch CPU wheels are large. Render build time, memory, and request duration depend on the service plan. The first model load and CPU inference can exceed low-tier limits.

## Verification

From `backend/`, run `python -m unittest discover -s tests -v`. Tests cover health, public processing route behavior, request validation, and static page serving. Actual AI inference should be verified on a host with the bundled model weights and compatible PyTorch runtime.
