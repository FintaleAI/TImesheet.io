from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Timesheet(TimestampMixin, Base):
    __tablename__ = "timesheets"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    employee_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"))
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)
    work_date: Mapped[date] = mapped_column(Date, nullable=False)
    hours: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    remarks: Mapped[str | None] = mapped_column(Text)
    overtime: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user = relationship("User")
    employee = relationship("Employee")
    project = relationship("Project", back_populates="timesheets")
