from flask import Blueprint, request, jsonify
from auth.schemas import SignupSchema, LoginSchema
from auth.service import (
    create_user, 
    authenticate_user, 
    update_user_password, 
    delete_user_by_id
)
from auth.jwt_utils import generate_token
from auth.otp_manager import generate_otp, verify_otp
from auth.email_service import send_welcome_email, send_otp_email
from werkzeug.security import generate_password_hash
from auth.models import User

auth_bp = Blueprint("auth", __name__)

# ---------- SIGNUP ----------
@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = SignupSchema(request.json)

    if not all([data.name, data.email, data.password]):
        return jsonify({"error": "All fields are required"}), 400

    if not data.is_valid_email():
        return jsonify({"error": "Invalid email domain"}), 400

    try:
        user = create_user(data.name, data.email, data.password)
    except ValueError as ve:
        if str(ve) == "USER_EXISTS":
            return jsonify({"error": "User already exists"}), 400
        return jsonify({"error": "Signup failed"}), 500
    except Exception as e:
        print("SIGNUP ERROR:", str(e))
        return jsonify({"error": "Signup failed"}), 500

    token = generate_token(user.id, user.email)

    # ✅ Welcome Email (non-critical)
    try:
        send_welcome_email(user.email, user.name)
    except Exception as e:
        print("WELCOME EMAIL ERROR:", str(e))

    return jsonify({
        "message": "✅ Signup successful",
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }), 201


# ---------- LOGIN ----------
@auth_bp.route("/login", methods=["POST"])
def login():
    data = LoginSchema(request.json)

    user = authenticate_user(data.email, data.password)
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    token = generate_token(user.id, user.email)

    return jsonify({
        "message": "✅ Login successful",
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }), 200


# ---------- FORGOT PASSWORD ----------
@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    email = request.json.get("email")

    if not email:
        return jsonify({"error": "Email required"}), 400

    # ✅ Check if user exists
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "Email not registered"}), 404

    # Generate OTP
    otp = generate_otp(email)

    # ✅ Send OTP Email
    email_sent = send_otp_email(email, otp)
    if not email_sent:
        return jsonify({"error": "Failed to send OTP email"}), 500

    return jsonify({"message": "✅ OTP sent to your email"}), 200


# ---------- RESET PASSWORD ----------
@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    email = request.json.get("email")
    otp = request.json.get("otp")
    new_password = request.json.get("new_password")

    if not (email and otp and new_password):
        return jsonify({"error": "Missing fields"}), 400

    if not verify_otp(email, otp):
        return jsonify({"error": "Invalid or expired OTP"}), 400

    hashed = generate_password_hash(new_password)
    updated = update_user_password(email, hashed)

    if not updated:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"message": "✅ Password reset successful"}), 200


# ---------- DELETE USER ----------
@auth_bp.route("/delete/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    success = delete_user_by_id(user_id)

    if not success:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"message": "✅ User permanently deleted"}), 200
