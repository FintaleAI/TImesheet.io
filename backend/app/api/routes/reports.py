from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.routes.employees import require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.reporting import (
    HoursByEmployeeItem,
    HoursByProjectItem,
    TimesheetSummaryOverview,
)
from app.services.reporting import (
    get_hours_by_employee,
    get_hours_by_project,
    get_timesheet_summary,
)

router = APIRouter()


@router.get("/timesheets/summary", response_model=TimesheetSummaryOverview)
def timesheet_summary(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> TimesheetSummaryOverview:
    return get_timesheet_summary(db, date_from=date_from, date_to=date_to)


@router.get("/timesheets/by-employee", response_model=list[HoursByEmployeeItem])
def timesheet_hours_by_employee(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[HoursByEmployeeItem]:
    return get_hours_by_employee(db, date_from=date_from, date_to=date_to)


@router.get("/timesheets/by-project", response_model=list[HoursByProjectItem])
def timesheet_hours_by_project(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[HoursByProjectItem]:
    return get_hours_by_project(db, date_from=date_from, date_to=date_to)
