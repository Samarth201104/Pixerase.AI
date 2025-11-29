import os
import uuid
import torch
import psycopg2
import jwt
from functools import wraps
from flask import Flask, request, send_file, jsonify, render_template
from flask_cors import CORS
from PIL import Image
from dotenv import load_dotenv
from auth.models import db
from auth.routes import auth_bp   # ✅ AUTH ROUTES

# Load environment variables
load_dotenv()

# Background imports
from background.model_loader import load_u2net, predict_mask
from background.background_removal import (
    composite_foreground_with_bg,
    refine_mask,
    load_template_background
)

# Object imports
from object.infer import (
    load_object_model,
    run_migan_inference,
    grabcut_with_rect,
    grabcut_with_brush,
)

# ==================== JWT CONFIG ====================
JWT_SECRET = os.getenv("JWT_SECRET_KEY", "pixerase_super_secret_jwt_key")

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        if "Authorization" in request.headers:
            parts = request.headers["Authorization"].split(" ")
            if len(parts) == 2:
                token = parts[1]

        if not token:
            return jsonify({"error": "Token missing"}), 401

        try:
            jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        except:
            return jsonify({"error": "Invalid or expired token"}), 401

        return f(*args, **kwargs)

    return decorated

# ==================== FLASK SETUP ====================
app = Flask(
    __name__,
    static_folder="frontend/static",
    template_folder="frontend/templates"
)
CORS(app)

# Load from .env in Docker (db service)
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False


db.init_app(app)

with app.app_context():
    db.create_all()

# ✅ REGISTER AUTH ROUTES
app.register_blueprint(auth_bp, url_prefix="/auth")

# ==================== PATHS ====================
UPLOAD = "frontend/static/uploads"
OUTPUT = "frontend/static/outputs"
TEMPLATE_BG = "frontend/static/backgrounds"

os.makedirs(UPLOAD, exist_ok=True)
os.makedirs(OUTPUT, exist_ok=True)
os.makedirs(TEMPLATE_BG, exist_ok=True)

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# ==================== LOAD MODELS ====================
bg_model = load_u2net("background/models/u2net.pth", device=DEVICE)
migan_model = load_object_model("object/models/migan_512_places2.pt", device=DEVICE)

# ==================== DB CONNECTION FUNCTION ====================
def get_db_connection():
    try:
        db_url = os.getenv("DATABASE_URL")

        if db_url:
            return psycopg2.connect(db_url)

        return psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            database=os.getenv("DB_NAME", "pix_erase"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASS")
        )
    except Exception as e:
        print("DB CONNECTION ERROR:", e)
        return None

# ==================== DB TEST ROUTES ====================
@app.route("/api/db-status")
def db_status():
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"status": "❌ Database not connected"}), 500
        conn.close()
        return jsonify({"status": "✅ Database connected successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/check-users-table")
def check_users_table():
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "DB not connected"}), 500

        cur = conn.cursor()
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'users'
            );
        """)
        exists = cur.fetchone()[0]

        cur.close()
        conn.close()

        if exists:
            return jsonify({"status": "✅ 'users' table exists"})
        else:
            return jsonify({"status": "❌ 'users' table NOT found"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==================== PUBLIC PAGES ====================
@app.route("/")
def index_page():
    return render_template("index.html")

@app.route("/login")
def login_page():
    return render_template("login.html")

@app.route("/signup")
def signup_page():
    return render_template("signup.html")

@app.route("/forgot-password")
def forgot_password_page():
    return render_template("forgot-password.html")

@app.route("/reset-password")
def reset_password_page():
    return render_template("reset-password.html")

# ==================== PROTECTED PAGES ====================
@app.route("/background")
def background_page():
    templates = os.listdir(TEMPLATE_BG)
    return render_template("background.html", templates=templates)

@app.route("/object")
def object_page():
    return render_template("object.html")

@app.route("/dashboard")
def dashboard_page():
    return render_template("dashboard.html")



# ==================== BACKGROUND API ====================
@app.route("/api/remove-background", methods=["POST"])
@token_required
def remove_background():

    file = request.files.get("image")
    if not file:
        return jsonify({"error": "No image uploaded"}), 400

    bg_upload = request.files.get("background")
    bg_template = request.form.get("bg_template")

    uid = uuid.uuid4().hex + ".png"
    inp = os.path.join(UPLOAD, uid)
    outp = os.path.join(OUTPUT, uid)

    file.save(inp)
    pil = Image.open(inp).convert("RGB")

    bg_img = None

    # ✅ Custom background
    if bg_upload and bg_upload.filename:
        print("✅ Custom background received")
        bg_img = Image.open(bg_upload).convert("RGB")

    # ✅ Template background
    elif bg_template:
        print("✅ Template selected:", bg_template)
        bg_img = load_template_background(bg_template, TEMPLATE_BG)

    mask = predict_mask(bg_model, pil)
    refined = refine_mask(mask)

    result = composite_foreground_with_bg(pil, refined, bg_img)
    result.save(outp)

    return send_file(outp, mimetype="image/png")


# ==================== OBJECT API ====================
# ==================== OBJECT API ====================
@app.route("/api/remove-object", methods=["POST"])
@token_required
def remove_object():

    img = request.files.get("image")
    mask_file = request.files.get("mask")
    mode = request.form.get("mode", "rect")

    if not img:
        return jsonify({"error": "missing image"}), 400

    uid = uuid.uuid4().hex
    img_path = os.path.join(UPLOAD, uid + ".png")
    out_path = os.path.join(OUTPUT, uid + ".png")
    img.save(img_path)

    if mode == "brush":
        if not mask_file:
            return jsonify({"error": "missing mask"}), 400

        mask_path = os.path.join(UPLOAD, uid + "_brush.png")
        mask_file.save(mask_path)
        final_mask_path = grabcut_with_brush(img_path, mask_path)

    else:
        rect_s = request.form.get("rect")
        if not rect_s:
            return jsonify({"error": "missing rect"}), 400

        x, y, w, h = list(map(int, rect_s.split(",")))

        pil_img = Image.open(img_path)
        img_w, img_h = pil_img.size

        canvas_w = int(request.form.get("canvas_w"))
        canvas_h = int(request.form.get("canvas_h"))

        scale_x = img_w / canvas_w
        scale_y = img_h / canvas_h

        real_x = int(x * scale_x)
        real_y = int(y * scale_y)
        real_w = int(w * scale_x)
        real_h = int(h * scale_y)

        real_rect = [real_x, real_y, real_w, real_h]
        final_mask_path = grabcut_with_rect(img_path, real_rect)

    # ✅ SAFE CALL (fixed infer already handles shape issues)
    run_migan_inference(
        migan_model, img_path, final_mask_path, out_path, device=DEVICE
    )

    return send_file(out_path, mimetype="image/png")



# ==================== RUN ====================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

