from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
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


def _validate_date_range(date_from: date | None, date_to: date | None) -> None:
    if date_from is not None and date_to is not None and date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_from cannot be later than date_to",
        )


@router.get("/timesheets/summary", response_model=TimesheetSummaryOverview)
def timesheet_summary(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> TimesheetSummaryOverview:
    _validate_date_range(date_from, date_to)
    return get_timesheet_summary(db, date_from=date_from, date_to=date_to)


@router.get("/timesheets/by-employee", response_model=list[HoursByEmployeeItem])
def timesheet_hours_by_employee(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[HoursByEmployeeItem]:
    _validate_date_range(date_from, date_to)
    return get_hours_by_employee(db, date_from=date_from, date_to=date_to)


@router.get("/timesheets/by-project", response_model=list[HoursByProjectItem])
def timesheet_hours_by_project(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[HoursByProjectItem]:
    _validate_date_range(date_from, date_to)
    return get_hours_by_project(db, date_from=date_from, date_to=date_to)
