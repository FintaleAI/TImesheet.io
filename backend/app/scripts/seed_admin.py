from sqlalchemy import select

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.auth_identity import AuthIdentity
from app.models.employee import Employee
from app.models.role import Role
from app.models.user import User


def main() -> None:
    db = SessionLocal()
    try:
        admin_role = db.execute(select(Role).where(Role.name == "Admin")).scalar_one_or_none()
        if admin_role is None:
            admin_role = Role(name="Admin", description="System administrator")
            db.add(admin_role)
            db.flush()

        employee = db.execute(
            select(Employee).where(Employee.employee_code == "EMP001")
        ).scalar_one_or_none()
        if employee is None:
            employee = Employee(
                employee_code="EMP001",
                full_name="Default Admin",
                designation="Administrator",
                status="active",
            )
            db.add(employee)
            db.flush()

        user = db.execute(
            select(User).where(User.employee_id == employee.id)
        ).scalar_one_or_none()
        if user is None:
            user = User(
                employee_id=employee.id,
                role_id=admin_role.id,
                is_active=True,
                must_change_password=True,
            )
            db.add(user)
            db.flush()

        identity = db.execute(
            select(AuthIdentity)
            .where(AuthIdentity.user_id == user.id)
            .where(AuthIdentity.provider == "password")
            .where(AuthIdentity.identifier == "admin")
        ).scalar_one_or_none()
        if identity is None:
            identity = AuthIdentity(
                user_id=user.id,
                provider="password",
                identifier="admin",
                password_hash=get_password_hash("admin123"),
                is_primary=True,
                is_verified=True,
            )
            db.add(identity)

        db.commit()
        print("Seeded admin credentials: username=admin password=admin123")
        print("Change the password immediately after first login.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
