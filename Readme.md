# Pixerase.AI

Flask web app for background removal and object inpainting using **U²-Net** and **MI‑GAN** (PyTorch).

---

## Features

* Background removal (U²‑Net) with optional background replacement
* Object removal / inpainting (MI‑GAN) with rectangle or brush masks
* Simple web UI (Flask templates) and REST endpoints
* PostgreSQL auth (Flask + SQLAlchemy + JWT)
* CUDA/GPU support if available

---

## Quick start — Local (recommended)

### 1. Create venv and activate

* **Windows (PowerShell)**

  ```
  python -m venv .venv
  .\.venv\Scripts\Activate.ps1
  ```

* **macOS / Linux**

  ```
  python -m venv .venv
  source .venv/bin/activate
  ```

### 2. Install dependencies

> **NOTE:** `torch`, `torchvision`, and `torchaudio` are large and often require the PyTorch index. Remove or comment the `torch` lines from `requirements.txt` and install them separately as shown below.

**CPU-only:**

```bash
pip install --upgrade pip setuptools wheel
pip install --no-cache-dir -r requirements.txt
pip install "torch==2.7.1+cu118" "torchvision==0.22.1+cu118" "torchaudio==2.7.1+cu118" -f https://download.pytorch.org/whl/cu118/torch_stable.html
```

**CUDA (GPU):**

```bash
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt   # ensure torch lines are removed
pip install "torch==2.7.1+cu118" "torchvision==0.22.1+cu118" "torchaudio==2.7.1+cu118" -f https://download.pytorch.org/whl/cu118/torch_stable.html
```

### 3. Place pre‑trained models

Download the pre-trained model weights and place them in the following directories:

```text
background/models/u2net.pth
object/models/migan_512_places2.pt
```

---

## 🔐 Environment Setup

Copy `.env.example` → `.env` and set:

```env
JWT_SECRET_KEY=your_jwt_secret
DATABASE_URL=postgresql://user:pass@host:port/dbname
```

The app defaults to a Postgres URL in `app.py` if not set.

---

## ▶ Run the app

```bash
python app.py
```

Dev server runs on: `http://127.0.0.1:5000`

---

## Docker

### CPU-only Docker

```bash
docker build -t pixerase-ai .
docker run -p 5000:5000 \
  -v %cd%/frontend/static/uploads:/app/frontend/static/uploads \
  -v %cd%/frontend/static/outputs:/app/frontend/static/outputs \
  pixerase-ai
```

### GPU Docker

Use a CUDA-enabled base image / PyTorch image and install CUDA wheels inside Docker.

```bash
docker run --gpus all -p 5000:5000 pixerase-ai
```

### Docker notes

* If `pip` times out when installing large wheels, add:

  * `--default-timeout=1000`
  * `--retries 5`
* Prefer using the PyTorch wheel index for CUDA builds.

---

## API

* `GET /` — UI

* `GET /background` — background removal page

* `GET /object` — object removal page

* `POST /api/remove-background`

  * `form-data`: `image` (required), `background` (optional)
  * returns PNG

* `POST /api/remove-object`

  * `form-data`: `image` (required)
  * `mode`: `rect` or `brush`
  * mask / rectangle parameters
  * returns PNG

### Auth

* Routes under `/auth` (Blueprint) handle signup/login.
* Protected endpoints require:

  ```
  Authorization: Bearer <token>
  ```

---

## Project layout

```text
app.py                      # Main Flask app and routes
background/                 # U²‑Net loader & background removal utilities
object/                     # MI‑GAN inference and object removal helpers
frontend/templates/         # HTML templates
frontend/static/            # JS / CSS / uploads / outputs
requirements.txt            # Dependencies (torch handled separately)
Dockerfile                  # Container build config
```

---

## ⚠️ Troubleshooting

* Slow model loads or double-loading in dev: run Flask with `use_reloader=False` or lazily load models on first request.
* Pip timeouts in Docker: increase timeout, add retries, or use the PyTorch wheel index.
* If `torch==2.7.1+cu118` fails, install via the official PyTorch wheel index.
* Docker daemon issues: restart Docker Desktop or run:

  ```powershell
  Restart-Service docker
  ```

---

## 🧠 Model Credits & Research Acknowledgement

This project uses **pre-trained research models** from the following papers and repositories:

### U²‑Net — Background Removal

* Paper: *U²‑Net: Going Deeper with Nested U-Structure for Salient Object Detection*
* Authors: Xuebin Qin, Zichen Zhang, Chenyang Huang, Masood Dehghan, Chunhua Shen, Ming‑Ming Cheng
* Used for high-quality foreground/background segmentation.

### MI‑GAN — Object Removal & Inpainting

* Paper: *MI-GAN: A Strong Baseline for Image Inpainting* (trained on Places2)
* Used for realistic object removal and hole-filling in images.

✅ All rights of the model architectures and pre-trained weights belong to their original authors.

---

## 📄 License & Contributing

* Add your license here.
* Contributions are welcome!

  * Open issues or PRs
  * Include reproducible steps and logs when reporting bugs
