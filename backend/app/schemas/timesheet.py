from datetime import date

from pydantic import BaseModel, Field


class TimesheetCreateRequest(BaseModel):
    work_date: date
    project_id: int = Field(..., gt=0)
    hours: float = Field(..., gt=0, le=24)
    remarks: str | None = None


class TimesheetCreateResponse(BaseModel):
    id: int
    work_date: date
    project_id: int
    hours: float
    overtime: bool
    remarks: str | None = None


class TimesheetUpdateRequest(BaseModel):
    work_date: date
    project_id: int = Field(..., gt=0)
    hours: float = Field(..., gt=0, le=24)
    remarks: str | None = None


class MyTimesheetItem(BaseModel):
    id: int
    work_date: date
    project_id: int
    project_code: str
    project_name: str
    hours: float
    overtime: bool
    remarks: str | None = None


class AdminTimesheetItem(BaseModel):
    id: int
    work_date: date
    employee_code: str | None = None
    employee_name: str | None = None
    project_id: int
    project_code: str
    project_name: str
    hours: float
    overtime: bool
    remarks: str | None = None
