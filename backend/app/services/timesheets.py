from datetime import date

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, joinedload

from app.models.project import Project
from app.models.timesheet import Timesheet
from app.models.user import User
from app.schemas.timesheet import TimesheetCreateRequest, TimesheetUpdateRequest


def create_timesheet(db: Session, user: User, payload: TimesheetCreateRequest) -> Timesheet:
    if user.employee is None:
        raise ValueError("Only employees linked to an employee profile can log time")

    project = db.execute(
        select(Project).where(Project.id == payload.project_id)
    ).scalar_one_or_none()
    if project is None:
        raise ValueError("Selected project does not exist")

    entry = Timesheet(
        user_id=user.id,
        employee_id=user.employee.id,
        project_id=payload.project_id,
        work_date=payload.work_date,
        hours=payload.hours,
        remarks=payload.remarks.strip() if payload.remarks else None,
        overtime=payload.hours > 8,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def get_timesheet(db: Session, timesheet_id: int) -> Timesheet | None:
    statement = (
        select(Timesheet)
        .options(joinedload(Timesheet.project), joinedload(Timesheet.employee))
        .where(Timesheet.id == timesheet_id)
    )
    return db.execute(statement).scalar_one_or_none()


def list_my_timesheets(db: Session, user_id: int) -> list[Timesheet]:
    statement: Select[tuple[Timesheet]] = (
        select(Timesheet)
        .options(joinedload(Timesheet.project))
        .where(Timesheet.user_id == user_id)
        .order_by(Timesheet.work_date.desc(), Timesheet.id.desc())
    )
    return list(db.execute(statement).scalars().all())


def list_all_timesheets(
    db: Session,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[Timesheet]:
    statement: Select[tuple[Timesheet]] = (
        select(Timesheet)
        .options(
            joinedload(Timesheet.project),
            joinedload(Timesheet.employee),
        )
        .order_by(Timesheet.work_date.desc(), Timesheet.id.desc())
    )
    if date_from is not None:
        statement = statement.where(Timesheet.work_date >= date_from)
    if date_to is not None:
        statement = statement.where(Timesheet.work_date <= date_to)
    return list(db.execute(statement).scalars().all())


def update_timesheet(
    db: Session,
    entry: Timesheet,
    payload: TimesheetUpdateRequest,
) -> Timesheet:
    project = db.execute(
        select(Project).where(Project.id == payload.project_id)
    ).scalar_one_or_none()
    if project is None:
        raise ValueError("Selected project does not exist")

    entry.work_date = payload.work_date
    entry.project_id = payload.project_id
    entry.hours = payload.hours
    entry.remarks = payload.remarks.strip() if payload.remarks else None
    entry.overtime = payload.hours > 8

    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def delete_timesheet(db: Session, entry: Timesheet) -> None:
    db.delete(entry)
    db.commit()
