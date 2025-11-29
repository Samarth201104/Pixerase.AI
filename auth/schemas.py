import re

class SignupSchema:
    def __init__(self, data):
        self.name = data.get("name")
        self.email = data.get("email")
        self.password = data.get("password")

    def is_valid_email(self):
        pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
        if not re.match(pattern, self.email):
            return False

        allowed_domains = ["gmail.com", "yahoo.com", "outlook.com"]
        domain = self.email.split("@")[-1]
        return domain in allowed_domains


class LoginSchema:
    def __init__(self, data):
        self.email = data.get("email")
        self.password = data.get("password")
