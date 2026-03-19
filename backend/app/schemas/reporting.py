from pydantic import BaseModel


class TimesheetSummaryOverview(BaseModel):
    total_entries: int
    total_hours: float
    overtime_entries: int
    overtime_hours: float


class HoursByEmployeeItem(BaseModel):
    employee_id: int | None = None
    employee_code: str | None = None
    employee_name: str | None = None
    total_entries: int
    total_hours: float
    overtime_entries: int
    overtime_hours: float


class HoursByProjectItem(BaseModel):
    project_id: int
    project_code: str
    project_name: str
    total_entries: int
    total_hours: float
    overtime_entries: int
    overtime_hours: float
