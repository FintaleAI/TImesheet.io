from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.routes.employees import require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.project import (
    ProjectCreateRequest,
    ProjectCreateResponse,
    ProjectListItem,
    ProjectUpdateRequest,
    ProjectUpdateResponse,
)
from app.services.projects import create_project, delete_project, list_projects, update_project

router = APIRouter()


@router.get("", response_model=list[ProjectListItem])
def get_projects(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ProjectListItem]:
    return [ProjectListItem.model_validate(project) for project in list_projects(db)]


@router.post("", response_model=ProjectCreateResponse, status_code=status.HTTP_201_CREATED)
def post_project(
    payload: ProjectCreateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> ProjectCreateResponse:
    project = create_project(db, payload)
    return ProjectCreateResponse(
        id=project.id,
        project_code=project.project_code,
        project_name=project.project_name,
    )


@router.put("/{project_id}", response_model=ProjectUpdateResponse)
def put_project(
    project_id: int,
    payload: ProjectUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> ProjectUpdateResponse:
    try:
        project = update_project(db, project_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return ProjectUpdateResponse(
        id=project.id,
        project_code=project.project_code,
        project_name=project.project_name,
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_project(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> None:
    deleted = delete_project(db, project_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
