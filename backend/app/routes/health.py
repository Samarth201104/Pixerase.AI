from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.get("/api/health")
def health():
    return jsonify({"success": True, "message": "Pixerase.AI backend is running.", "data": {"status": "ok"}})
