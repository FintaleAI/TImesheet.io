from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Username now, company email later")
    password: str = Field(..., min_length=8)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    must_change_password: bool
    role: str | None = None
    user_id: int


class CurrentUserResponse(BaseModel):
    user_id: int
    role: str | None = None
    employee_id: int | None = None
    employee_name: str | None = None
    must_change_password: bool


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=8)
    new_password: str = Field(..., min_length=8)
    confirm_new_password: str = Field(..., min_length=8)


class ChangePasswordResponse(BaseModel):
    message: str
    must_change_password: bool
