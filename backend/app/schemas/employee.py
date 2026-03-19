from pydantic import BaseModel, ConfigDict, EmailStr, Field


class EmployeeListItem(BaseModel):
    id: int
    employee_code: str
    full_name: str
    designation: str | None = None
    qualification: str | None = None
    contact_number: str | None = None
    company_email: EmailStr | None = None
    status: str
    username: str | None = None
    role: str | None = None

    model_config = ConfigDict(from_attributes=True)


class EmployeeCreateRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    qualification: str | None = Field(default=None, max_length=255)
    designation: str | None = Field(default=None, max_length=255)
    contact_number: str | None = Field(default=None, max_length=50)
    company_email: EmailStr | None = None
    address: str | None = None
    username: str = Field(..., min_length=3, max_length=255)
    temporary_password: str = Field(..., min_length=8, max_length=255)


class EmployeeCreateResponse(BaseModel):
    id: int
    employee_code: str
    user_id: int
    username: str
    must_change_password: bool


class EmployeeUpdateRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    qualification: str | None = Field(default=None, max_length=255)
    designation: str | None = Field(default=None, max_length=255)
    contact_number: str | None = Field(default=None, max_length=50)
    company_email: EmailStr | None = None
    address: str | None = None
    username: str = Field(..., min_length=3, max_length=255)
    status: str = Field(..., min_length=3, max_length=50)


class EmployeeUpdateResponse(BaseModel):
    id: int
    employee_code: str
    username: str
    status: str
