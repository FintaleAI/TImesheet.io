from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class ProjectListItem(BaseModel):
    id: int
    project_code: str
    project_name: str
    start_date: date | None = None
    is_recurring: bool
    client_name: str | None = None
    client_gst: str | None = None
    address: str | None = None
    contact_details: str | None = None
    timeline: str | None = None
    fee_details: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ProjectCreateRequest(BaseModel):
    project_name: str = Field(..., min_length=2, max_length=255)
    start_date: date | None = None
    is_recurring: bool = False
    client_name: str | None = Field(default=None, max_length=255)
    client_gst: str | None = Field(default=None, max_length=100)
    address: str | None = None
    contact_details: str | None = None
    timeline: str | None = Field(default=None, max_length=255)
    fee_details: str | None = None


class ProjectCreateResponse(BaseModel):
    id: int
    project_code: str
    project_name: str


class ProjectUpdateRequest(BaseModel):
    project_name: str = Field(..., min_length=2, max_length=255)
    start_date: date | None = None
    is_recurring: bool = False
    client_name: str | None = Field(default=None, max_length=255)
    client_gst: str | None = Field(default=None, max_length=100)
    address: str | None = None
    contact_details: str | None = None
    timeline: str | None = Field(default=None, max_length=255)
    fee_details: str | None = None


class ProjectUpdateResponse(BaseModel):
    id: int
    project_code: str
    project_name: str
