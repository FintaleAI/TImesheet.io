from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Employee(TimestampMixin, Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    designation: Mapped[str | None] = mapped_column(String(255))
    qualification: Mapped[str | None] = mapped_column(String(255))
    contact_number: Mapped[str | None] = mapped_column(String(50))
    company_email: Mapped[str | None] = mapped_column(String(255), unique=True)
    address: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)

    user = relationship("User", back_populates="employee", uselist=False)
