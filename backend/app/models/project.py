from datetime import date

from sqlalchemy import Boolean, Date, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Project(TimestampMixin, Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    project_name: Mapped[str] = mapped_column(String(255), nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date)
    client_name: Mapped[str | None] = mapped_column(String(255))
    client_gst: Mapped[str | None] = mapped_column(String(100))
    address: Mapped[str | None] = mapped_column(Text)
    contact_details: Mapped[str | None] = mapped_column(Text)
    timeline: Mapped[str | None] = mapped_column(String(255))
    fee_details: Mapped[str | None] = mapped_column(Text)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    timesheets = relationship("Timesheet", back_populates="project")
