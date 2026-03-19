from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project import Project
from app.schemas.project import ProjectCreateRequest, ProjectUpdateRequest


def _project_code_sequence(latest_code: str | None) -> str:
    if latest_code is None:
        return "PRJ001"
    suffix = latest_code.removeprefix("PRJ")
    try:
        next_number = int(suffix) + 1
    except ValueError:
        next_number = 1
    return f"PRJ{next_number:03d}"


def generate_project_code(db: Session) -> str:
    latest_code = db.execute(
        select(Project.project_code).order_by(Project.project_code.desc()).limit(1)
    ).scalar_one_or_none()
    return _project_code_sequence(latest_code)


def list_projects(db: Session) -> list[Project]:
    statement = select(Project).order_by(Project.project_code.asc())
    return list(db.execute(statement).scalars().all())


def create_project(db: Session, payload: ProjectCreateRequest) -> Project:
    project = Project(
        project_code=generate_project_code(db),
        project_name=payload.project_name.strip(),
        start_date=payload.start_date,
        is_recurring=payload.is_recurring,
        client_name=payload.client_name.strip() if payload.client_name else None,
        client_gst=payload.client_gst.strip() if payload.client_gst else None,
        address=payload.address.strip() if payload.address else None,
        contact_details=payload.contact_details.strip() if payload.contact_details else None,
        timeline=payload.timeline.strip() if payload.timeline else None,
        fee_details=payload.fee_details.strip() if payload.fee_details else None,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def get_project(db: Session, project_id: int) -> Project | None:
    return db.execute(select(Project).where(Project.id == project_id)).scalar_one_or_none()


def update_project(db: Session, project_id: int, payload: ProjectUpdateRequest) -> Project:
    project = get_project(db, project_id)
    if project is None:
        raise ValueError("Project not found")

    project.project_name = payload.project_name.strip()
    project.start_date = payload.start_date
    project.is_recurring = payload.is_recurring
    project.client_name = payload.client_name.strip() if payload.client_name else None
    project.client_gst = payload.client_gst.strip() if payload.client_gst else None
    project.address = payload.address.strip() if payload.address else None
    project.contact_details = payload.contact_details.strip() if payload.contact_details else None
    project.timeline = payload.timeline.strip() if payload.timeline else None
    project.fee_details = payload.fee_details.strip() if payload.fee_details else None

    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def delete_project(db: Session, project_id: int) -> bool:
    project = get_project(db, project_id)
    if project is None:
        return False
    db.delete(project)
    db.commit()
    return True
