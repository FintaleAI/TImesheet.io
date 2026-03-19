from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_password_hash
from app.models.auth_identity import AuthIdentity
from app.models.employee import Employee
from app.models.role import Role
from app.models.user import User
from app.schemas.employee import EmployeeCreateRequest, EmployeeUpdateRequest


def _employee_code_sequence(latest_code: str | None) -> str:
    if latest_code is None:
        return "EMP001"
    suffix = latest_code.removeprefix("EMP")
    try:
        next_number = int(suffix) + 1
    except ValueError:
        next_number = 1
    return f"EMP{next_number:03d}"


def generate_employee_code(db: Session) -> str:
    latest_code = db.execute(
        select(Employee.employee_code).order_by(Employee.employee_code.desc()).limit(1)
    ).scalar_one_or_none()
    return _employee_code_sequence(latest_code)


def get_or_create_employee_role(db: Session) -> Role:
    role = db.execute(select(Role).where(Role.name == "Employee")).scalar_one_or_none()
    if role is None:
        role = Role(name="Employee", description="Employee user")
        db.add(role)
        db.flush()
    return role


def list_employees(db: Session) -> list[User]:
    statement = (
        select(User)
        .options(
            joinedload(User.employee),
            joinedload(User.role),
            joinedload(User.auth_identities),
        )
        .join(User.employee)
        .order_by(Employee.employee_code.asc())
    )
    return list(db.execute(statement).scalars().unique().all())


def get_employee_user(db: Session, employee_id: int) -> User | None:
    statement = (
        select(User)
        .options(
            joinedload(User.employee),
            joinedload(User.role),
            joinedload(User.auth_identities),
        )
        .where(User.employee_id == employee_id)
    )
    return db.execute(statement).scalars().unique().one_or_none()


def create_employee(db: Session, payload: EmployeeCreateRequest) -> tuple[Employee, User, AuthIdentity]:
    normalized_username = payload.username.strip().lower()
    normalized_email = payload.company_email.lower() if payload.company_email else None

    existing_identity = db.execute(
        select(AuthIdentity).where(
            and_(
                AuthIdentity.provider == "password",
                AuthIdentity.identifier == normalized_username,
            )
        )
    ).scalar_one_or_none()
    if existing_identity is not None:
        raise ValueError("Username already exists")

    if normalized_email:
        existing_employee_email = db.execute(
            select(Employee).where(func.lower(Employee.company_email) == normalized_email)
        ).scalar_one_or_none()
        if existing_employee_email is not None:
            raise ValueError("Company email already exists")

    role = get_or_create_employee_role(db)
    employee = Employee(
        employee_code=generate_employee_code(db),
        full_name=payload.full_name.strip(),
        qualification=payload.qualification.strip() if payload.qualification else None,
        designation=payload.designation.strip() if payload.designation else None,
        contact_number=payload.contact_number.strip() if payload.contact_number else None,
        company_email=normalized_email,
        address=payload.address.strip() if payload.address else None,
        status="active",
    )
    db.add(employee)
    db.flush()

    user = User(
        employee_id=employee.id,
        role_id=role.id,
        is_active=True,
        must_change_password=True,
    )
    db.add(user)
    db.flush()

    identity = AuthIdentity(
        user_id=user.id,
        provider="password",
        identifier=normalized_username,
        password_hash=get_password_hash(payload.temporary_password),
        is_primary=True,
        is_verified=True,
    )
    db.add(identity)
    db.flush()
    db.commit()
    db.refresh(employee)
    db.refresh(user)
    db.refresh(identity)
    return employee, user, identity


def update_employee(
    db: Session,
    employee_id: int,
    payload: EmployeeUpdateRequest,
) -> tuple[Employee, AuthIdentity]:
    user = get_employee_user(db, employee_id)
    if user is None or user.employee is None:
        raise ValueError("Employee not found")

    employee = user.employee
    identity = next(
        (
            item
            for item in user.auth_identities
            if item.provider == "password" and item.is_primary
        ),
        None,
    )
    if identity is None:
        raise ValueError("Primary login identity not found")

    normalized_username = payload.username.strip().lower()
    normalized_email = payload.company_email.lower() if payload.company_email else None

    existing_identity = db.execute(
        select(AuthIdentity)
        .where(AuthIdentity.provider == "password")
        .where(AuthIdentity.identifier == normalized_username)
        .where(AuthIdentity.id != identity.id)
    ).scalar_one_or_none()
    if existing_identity is not None:
        raise ValueError("Username already exists")

    if normalized_email:
        existing_email = db.execute(
            select(Employee)
            .where(func.lower(Employee.company_email) == normalized_email)
            .where(Employee.id != employee.id)
        ).scalar_one_or_none()
        if existing_email is not None:
            raise ValueError("Company email already exists")

    employee.full_name = payload.full_name.strip()
    employee.qualification = payload.qualification.strip() if payload.qualification else None
    employee.designation = payload.designation.strip() if payload.designation else None
    employee.contact_number = payload.contact_number.strip() if payload.contact_number else None
    employee.company_email = normalized_email
    employee.address = payload.address.strip() if payload.address else None
    employee.status = payload.status.strip()
    identity.identifier = normalized_username

    db.add(employee)
    db.add(identity)
    db.commit()
    db.refresh(employee)
    db.refresh(identity)
    return employee, identity


def delete_employee(db: Session, employee_id: int) -> bool:
    user = get_employee_user(db, employee_id)
    if user is None or user.employee is None:
        return False
    db.delete(user)
    db.delete(user.employee)
    db.commit()
    return True
