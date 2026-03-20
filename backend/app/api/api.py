from fastapi import APIRouter

from app.api.routes import auth, employees, health, projects, reports, timesheets

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(employees.router, prefix="/employees", tags=["employees"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(timesheets.router, prefix="/timesheets", tags=["timesheets"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
#here we can add more routes in the future