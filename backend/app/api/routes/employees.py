from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.employee import (
    EmployeeCreateRequest,
    EmployeeCreateResponse,
    EmployeeListItem,
    EmployeeUpdateRequest,
    EmployeeUpdateResponse,
)
from app.services.employees import create_employee, delete_employee, list_employees, update_employee

router = APIRouter()


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role is None or current_user.role.name != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


@router.get("", response_model=list[EmployeeListItem])
def get_employees(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[EmployeeListItem]:
    users = list_employees(db)
    response: list[EmployeeListItem] = []
    for user in users:
        employee = user.employee
        if employee is None:
            continue
        primary_identity = next(
            (
                identity
                for identity in user.auth_identities
                if identity.provider == "password" and identity.is_primary
            ),
            None,
        )
        response.append(
            EmployeeListItem(
                id=employee.id,
                employee_code=employee.employee_code,
                full_name=employee.full_name,
                designation=employee.designation,
                qualification=employee.qualification,
                contact_number=employee.contact_number,
                company_email=employee.company_email,
                status=employee.status,
                username=primary_identity.identifier if primary_identity else None,
                role=user.role.name if user.role else None,
            )
        )
    return response


@router.post("", response_model=EmployeeCreateResponse, status_code=status.HTTP_201_CREATED)
def post_employee(
    payload: EmployeeCreateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> EmployeeCreateResponse:
    try:
        employee, user, identity = create_employee(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    return EmployeeCreateResponse(
        id=employee.id,
        employee_code=employee.employee_code,
        user_id=user.id,
        username=identity.identifier,
        must_change_password=user.must_change_password,
    )


@router.put("/{employee_id}", response_model=EmployeeUpdateResponse)
def put_employee(
    employee_id: int,
    payload: EmployeeUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> EmployeeUpdateResponse:
    try:
        employee, identity = update_employee(db, employee_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    return EmployeeUpdateResponse(
        id=employee.id,
        employee_code=employee.employee_code,
        username=identity.identifier,
        status=employee.status,
    )


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> None:
    deleted = delete_employee(db, employee_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
