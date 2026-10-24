import logging

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import RequestEntityTooLarge

from app.config import Config
from app.routes.background import background_bp
from app.routes.health import health_bp
from app.routes.object_removal import object_bp

logger = logging.getLogger(__name__)


def create_app(config_object=Config):
    frontend_dir = config_object.FRONTEND_PATH
    app = Flask(__name__, static_folder=str(frontend_dir), static_url_path="")
    app.config.from_object(config_object)
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})
    app.register_blueprint(health_bp)
    app.register_blueprint(background_bp)
    app.register_blueprint(object_bp)

    @app.get("/")
    def index():
        return send_from_directory(frontend_dir, "index.html")

    @app.after_request
    def security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        return response

    @app.errorhandler(RequestEntityTooLarge)
    def too_large(_error):
        return jsonify({"success": False, "message": "Your image is too large.", "error": "FILE_TOO_LARGE"}), 413

    @app.errorhandler(404)
    def not_found(_error):
        if request.path.startswith("/api/"):
            return jsonify({"success": False, "message": "The requested API endpoint was not found.", "error": "NOT_FOUND"}), 404
        return "Not found", 404

    @app.errorhandler(Exception)
    def unexpected_error(error):
        logger.exception("Unhandled request error", exc_info=error)
        if request.path.startswith("/api/"):
            return jsonify({"success": False, "message": "Something went wrong while processing your request.", "error": "INTERNAL_ERROR"}), 500
        return "Something went wrong. Please try again.", 500

    return app
