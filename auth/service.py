from auth.models import User, db
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.exc import IntegrityError

def create_user(name, email, password):
    """
    Create a new user with hashed password.
    Raises ValueError('USER_EXISTS') if email is already taken.
    """
    hashed = generate_password_hash(password)

    user = User(
        name=name,
        email=email,
        password=hashed
    )

    db.session.add(user)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        # Email is unique in DB, so this means duplicate email
        raise ValueError("USER_EXISTS")

    return user


def authenticate_user(email, password):
    """
    Return user if email/password are correct, else None.
    """
    user = User.query.filter_by(email=email).first()

    if not user:
        return None

    if not check_password_hash(user.password, password):
        return None

    return user


def delete_user_by_id(user_id):
    """
    Hard delete a user by ID. Returns True if deleted, False if not found.
    """
    user = User.query.filter_by(id=user_id).first()

    if not user:
        return False

    db.session.delete(user)
    db.session.commit()
    return True


def update_user_password(email, new_hashed_password):
    """
    Update stored password hash for a given user email.
    """
    user = User.query.filter_by(email=email).first()

    if not user:
        return None

    user.password = new_hashed_password
    db.session.commit()
    return True