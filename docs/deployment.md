# Deployment

## Vercel frontend

Set the Vercel project root directory to `frontend/`. Set `window.APP_CONFIG.apiBaseUrl` in `frontend/js/config.js` to the public HTTPS origin of the Render API, without a trailing slash. `frontend/vercel.json` rewrites the home, background, and object routes to their static HTML documents.

## Render backend

Use a native Python web service with root directory `backend/`, build command `pip install -r requirements.txt`, and start command `gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 2 --timeout 180 run:app`. Configure `CORS_ORIGINS` to the exact Vercel origin and leave `FLASK_DEBUG=false`.

The service requires both bundled model weight files and enough memory for PyTorch plus model inference. Cold model load and CPU processing may exceed lower tier memory or request limits.
