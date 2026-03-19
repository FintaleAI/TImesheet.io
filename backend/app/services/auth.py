from sqlalchemy import Select, select
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_password_hash, verify_password
from app.models.auth_identity import AuthIdentity
from app.models.user import User


def _identity_load_options():
    return (
        joinedload(AuthIdentity.user).joinedload(User.role),
        joinedload(AuthIdentity.user).joinedload(User.employee),
    )


def get_user_by_identifier(db: Session, identifier: str) -> User | None:
    normalized = identifier.strip().lower()
    statement: Select[tuple[AuthIdentity]] = (
        select(AuthIdentity)
        .options(*_identity_load_options())
        .where(AuthIdentity.identifier == normalized)
        .where(AuthIdentity.provider == "password")
    )
    identity = db.execute(statement).scalar_one_or_none()
    return identity.user if identity and identity.user else None


def get_user_by_id(db: Session, user_id: int) -> User | None:
    statement: Select[tuple[User]] = (
        select(User)
        .options(
            joinedload(User.role),
            joinedload(User.employee),
        )
        .where(User.id == user_id)
    )
    return db.execute(statement).scalar_one_or_none()


def authenticate_user(db: Session, identifier: str, password: str) -> User | None:
    normalized = identifier.strip().lower()
    statement: Select[tuple[AuthIdentity]] = (
        select(AuthIdentity)
        .options(*_identity_load_options())
        .where(AuthIdentity.identifier == normalized)
        .where(AuthIdentity.provider == "password")
    )
    identity = db.execute(statement).scalar_one_or_none()
    if identity is None or identity.user is None or not identity.password_hash:
        return None
    if not identity.user.is_active:
        return None
    if not verify_password(password, identity.password_hash):
        return None
    return identity.user


def change_password(
    db: Session,
    user: User,
    current_password: str,
    new_password: str,
) -> bool:
    statement: Select[tuple[AuthIdentity]] = (
        select(AuthIdentity)
        .where(AuthIdentity.user_id == user.id)
        .where(AuthIdentity.provider == "password")
        .where(AuthIdentity.is_primary.is_(True))
    )
    identity = db.execute(statement).scalar_one_or_none()
    if identity is None or not identity.password_hash:
        return False
    if not verify_password(current_password, identity.password_hash):
        return False

    identity.password_hash = get_password_hash(new_password)
    user.must_change_password = False
    db.add(identity)
    db.add(user)
    db.commit()
    db.refresh(user)
    return True
