import random
import time

OTP_STORE = {}

def generate_otp(email):
    otp = str(random.randint(100000, 999999))
    expiry = time.time() + 300  # 5 minutes expiry
    OTP_STORE[email] = {"otp": otp, "expiry": expiry}
    return otp

def verify_otp(email, otp):
    data = OTP_STORE.get(email)

    if not data:
        return False

    if time.time() > data["expiry"]:
        del OTP_STORE[email]
        return False

    return data["otp"] == otp
