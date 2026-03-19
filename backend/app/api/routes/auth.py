from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import create_access_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ChangePasswordResponse,
    CurrentUserResponse,
    LoginRequest,
    TokenResponse,
)
from app.services.auth import authenticate_user, change_password

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = authenticate_user(db, payload.identifier, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    role_name = user.role.name if user.role else None
    access_token = create_access_token(str(user.id))
    return TokenResponse(
        access_token=access_token,
        must_change_password=user.must_change_password,
        role=role_name,
        user_id=user.id,
    )


@router.get("/me", response_model=CurrentUserResponse)
def me(current_user: User = Depends(get_current_user)) -> CurrentUserResponse:
    role_name = current_user.role.name if current_user.role else None
    employee_name = current_user.employee.full_name if current_user.employee else None
    employee_id = current_user.employee.id if current_user.employee else None
    return CurrentUserResponse(
        user_id=current_user.id,
        role=role_name,
        employee_id=employee_id,
        employee_name=employee_name,
        must_change_password=current_user.must_change_password,
    )


@router.post("/change-password", response_model=ChangePasswordResponse)
def update_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChangePasswordResponse:
    if payload.new_password != payload.confirm_new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match",
        )
    if payload.current_password == payload.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password",
        )

    updated = change_password(
        db,
        current_user,
        payload.current_password,
        payload.new_password,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    return ChangePasswordResponse(
        message="Password updated successfully",
        must_change_password=False,
    )
