import os
import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

EMAIL_USER = os.getenv("MAIL_USERNAME")
EMAIL_PASS = os.getenv("MAIL_PASSWORD")


def send_email(to_email, subject, body):
    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = f"Pixerase.AI <{EMAIL_USER}>"
        msg["To"] = to_email

        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASS)
        server.send_message(msg)
        server.quit()

        return True

    except Exception as e:
        print("EMAIL ERROR:", str(e))
        return False


def send_welcome_email(to_email, name):
    subject = "🎉 Welcome to Pixerase.AI"
    body = f"""
Hi {name},

✅ Your account has been successfully created for Pixerase.AI.

You can now log in and use our AI tools.

– Team Pixerase.AI
"""

    return send_email(to_email, subject, body)


def send_otp_email(to_email, otp):
    subject = "🔐 Reset your Pixerase.AI password"
    body = f"""
Hi,

Your OTP to reset your password is:

👉 {otp}

This OTP will expire in 5 minutes.

– Team Pixerase.AI
"""

    return send_email(to_email, subject, body)
