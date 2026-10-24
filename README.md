# Pixerase.AI

**Clean up images in your browser with AI.** Pixerase.AI is a web app for removing image backgrounds and erasing unwanted objects. Upload a picture, make an edit, preview the result, and download it as a PNG.

The project uses a plain HTML, CSS, and JavaScript frontend and a Python Flask API. Background removal is powered by **U²-Net** and object removal by **MI-GAN**.

## What you can do

- **Remove a background:** create a transparent cutout, or put the subject on a supplied or custom background.
- **Erase objects:** mark one or more objects with rectangles and brush strokes, then process all marks together. Use the eraser to refine the marked area.
- **Preview and download:** inspect the result and save it as a PNG.
- **Use light or dark mode:** the selected theme is remembered in your browser.
- **Upload common image formats:** JPG, PNG, and WebP. The default upload limit is 25 MB, with a 12-megapixel decoded-image limit.

## Try it locally

### Requirements

- Python 3.10
- Git LFS, so the U²-Net model weights are available after cloning
- A modern browser

Clone the repository (including its LFS files), then start the API:

```bash
git lfs install
git clone https://github.com/Samarth201104/Pixerase.AI.git
cd Pixerase.AI/backend
python -m venv .venv
```

Activate the environment and install dependencies:

```powershell
# Windows PowerShell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

```bash
# macOS / Linux
source .venv/bin/activate
pip install -r requirements.txt
```

Run the Flask API:

```bash
python run.py
```

The API listens on `http://127.0.0.1:5000`. In a second terminal, from the repository root, serve the static frontend:

```bash
python -m http.server 8000 --directory frontend
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000). The frontend's default API address is `http://localhost:5000`, configured in [`frontend/js/config.js`](frontend/js/config.js). If you change the API address, update `apiBaseUrl` in that file and reload the page.

The first request to each image tool loads its model and may take a while. CPU inference can be slow and memory intensive.

## How to use the tools

### Background removal

1. Open **Background removal** and upload or drop in a JPG, PNG, or WebP image.
2. Select **Remove background** to create a transparent result.
3. To replace the background, choose a template or upload your own image, then select **Apply background**.
4. Preview the result and choose **Download PNG**.

### Object removal

1. Open **Object removal** and upload an image.
2. Mark each object to remove with **Rectangle** or **Brush**. You can combine tools and mark multiple areas in one image.
3. Use **Eraser**, **Undo**, or **Redo** to refine your marks. Include a little of the surrounding area for better fill results.
4. Select **Remove object**, review the result, and download the PNG.

## Deploying

The repository includes a Render Blueprint in [`render.yaml`](render.yaml) for the Flask API and Vercel routing in [`frontend/vercel.json`](frontend/vercel.json) for the static site.

### Backend on Render

Create a Render Blueprint from this repository and apply the settings in `render.yaml`. The service uses `backend/` as its root directory and exposes a health endpoint at `/api/health`. Set `CORS_ORIGINS` to the exact origin of the deployed frontend (for example, `https://your-project.vercel.app`).

### Frontend on Vercel

Create a Vercel project from the repository with `frontend/` as its **Root Directory**. Before deploying, set `apiBaseUrl` in `frontend/js/config.js` to the Render service's public HTTPS URL, without a trailing slash; for example:

```js
window.APP_CONFIG = { apiBaseUrl: "https://your-service.onrender.com" };
```

Then update Render's `CORS_ORIGINS` to your Vercel domain and redeploy the backend if needed.

**Hosting note:** both models run on the backend. Free hosting plans can have limited memory, CPU, request time, and idle behavior. A successful health check does not guarantee that model inference will fit within a provider's limits. Check the provider logs and test both tools after deployment.

## Privacy and limits

Pixerase.AI does not require an account. The backend processes uploads in temporary request storage and removes temporary files after the response; it does not provide an image gallery or image history. Do not upload sensitive images to a public deployment unless you trust its hosting and operations.

The default limits are **25 MB per upload** and **12 million image pixels**. They can be changed with `MAX_UPLOAD_SIZE` and `MAX_IMAGE_PIXELS`. See [`.env.example`](.env.example) for backend settings. `CORS_ORIGINS` controls which browser origins can call the API.

## Project structure

```text
backend/
  app/
    routes/       Flask API and health routes
    services/     Model loading and image processing
    models/       U²-Net and MI-GAN implementations and weights
    utils/        Upload and image validation
  requirements.txt
  run.py
frontend/
  index.html      Home page
  background.html Background removal tool
  object.html     Object removal tool
  css/            Shared styles and themes
  js/             Page behavior and API calls
  assets/         Icons and background templates
render.yaml       Render Blueprint
```

## API overview

- `GET /api/health` — health check.
- `POST /api/remove-background` — multipart form with `image`; optional `background` or `bg_template`; returns a PNG.
- `POST /api/remove-object` — multipart form with `image` and the object-selection data; returns a PNG.

The browser frontend calls these endpoints directly. See the Flask routes in `backend/app/routes/` for request details.

## License

Check the licenses for the source code and bundled model weights before redistributing or using this project commercially.
