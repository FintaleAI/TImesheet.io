from datetime import date

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.models.project import Project
from app.models.timesheet import Timesheet
from app.schemas.reporting import (
    HoursByEmployeeItem,
    HoursByProjectItem,
    TimesheetSummaryOverview,
)


def _apply_date_filters(statement, date_from: date | None, date_to: date | None):
    if date_from is not None:
        statement = statement.where(Timesheet.work_date >= date_from)
    if date_to is not None:
        statement = statement.where(Timesheet.work_date <= date_to)
    return statement


def get_timesheet_summary(
    db: Session,
    date_from: date | None = None,
    date_to: date | None = None,
) -> TimesheetSummaryOverview:
    overtime_hours_expr = case((Timesheet.overtime.is_(True), Timesheet.hours), else_=0)
    statement = select(
        func.count(Timesheet.id),
        func.coalesce(func.sum(Timesheet.hours), 0),
        func.coalesce(func.sum(case((Timesheet.overtime.is_(True), 1), else_=0)), 0),
        func.coalesce(func.sum(overtime_hours_expr), 0),
    )
    statement = _apply_date_filters(statement, date_from, date_to)
    total_entries, total_hours, overtime_entries, overtime_hours = db.execute(statement).one()
    return TimesheetSummaryOverview(
        total_entries=int(total_entries or 0),
        total_hours=float(total_hours or 0),
        overtime_entries=int(overtime_entries or 0),
        overtime_hours=float(overtime_hours or 0),
    )


def get_hours_by_employee(
    db: Session,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[HoursByEmployeeItem]:
    overtime_hours_expr = case((Timesheet.overtime.is_(True), Timesheet.hours), else_=0)
    statement = (
        select(
            Employee.id,
            Employee.employee_code,
            Employee.full_name,
            func.count(Timesheet.id),
            func.coalesce(func.sum(Timesheet.hours), 0),
            func.coalesce(func.sum(case((Timesheet.overtime.is_(True), 1), else_=0)), 0),
            func.coalesce(func.sum(overtime_hours_expr), 0),
        )
        .outerjoin(Timesheet, Timesheet.employee_id == Employee.id)
        .group_by(Employee.id, Employee.employee_code, Employee.full_name)
        .order_by(func.coalesce(func.sum(Timesheet.hours), 0).desc(), Employee.employee_code.asc())
    )
    if date_from is not None:
        statement = statement.where((Timesheet.work_date >= date_from) | (Timesheet.id.is_(None)))
    if date_to is not None:
        statement = statement.where((Timesheet.work_date <= date_to) | (Timesheet.id.is_(None)))

    rows = db.execute(statement).all()
    return [
        HoursByEmployeeItem(
            employee_id=row[0],
            employee_code=row[1],
            employee_name=row[2],
            total_entries=int(row[3] or 0),
            total_hours=float(row[4] or 0),
            overtime_entries=int(row[5] or 0),
            overtime_hours=float(row[6] or 0),
        )
        for row in rows
    ]


def get_hours_by_project(
    db: Session,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[HoursByProjectItem]:
    overtime_hours_expr = case((Timesheet.overtime.is_(True), Timesheet.hours), else_=0)
    statement = (
        select(
            Project.id,
            Project.project_code,
            Project.project_name,
            func.count(Timesheet.id),
            func.coalesce(func.sum(Timesheet.hours), 0),
            func.coalesce(func.sum(case((Timesheet.overtime.is_(True), 1), else_=0)), 0),
            func.coalesce(func.sum(overtime_hours_expr), 0),
        )
        .outerjoin(Timesheet, Timesheet.project_id == Project.id)
        .group_by(Project.id, Project.project_code, Project.project_name)
        .order_by(func.coalesce(func.sum(Timesheet.hours), 0).desc(), Project.project_code.asc())
    )
    if date_from is not None:
        statement = statement.where((Timesheet.work_date >= date_from) | (Timesheet.id.is_(None)))
    if date_to is not None:
        statement = statement.where((Timesheet.work_date <= date_to) | (Timesheet.id.is_(None)))

    rows = db.execute(statement).all()
    return [
        HoursByProjectItem(
            project_id=row[0],
            project_code=row[1],
            project_name=row[2],
            total_entries=int(row[3] or 0),
            total_hours=float(row[4] or 0),
            overtime_entries=int(row[5] or 0),
            overtime_hours=float(row[6] or 0),
        )
        for row in rows
    ]
