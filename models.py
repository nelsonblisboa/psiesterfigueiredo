from typing import Optional, List
from datetime import datetime, date, timezone
import uuid
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy.dialects.postgresql import JSONB

class SessionTable(SQLModel, table=True):
    __tablename__ = "sessions"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_identifier: str = Field(index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_active_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    messages: List["ChatMessageTable"] = Relationship(back_populates="session")
    appointments: List["AppointmentTable"] = Relationship(back_populates="session")

class ChatMessageTable(SQLModel, table=True):
    __tablename__ = "chat_messages"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    session_id: str = Field(foreign_key="sessions.id")
    role: str  # user, assistant, system
    content: str
    metadata_json: Optional[dict] = Field(default=None, sa_column=Column(JSONB))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    session: SessionTable = Relationship(back_populates="messages")

class AppointmentTable(SQLModel, table=True):
    __tablename__ = "appointments"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    session_id: Optional[str] = Field(default=None, foreign_key="sessions.id")
    name: str
    email: str
    whatsapp: str
    date: date
    time: str
    status: str = Field(default="pending_payment")  # pending_payment, confirmed, cancelled, expired
    expires_at: datetime  # expiration of 15 min lock
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    session: Optional[SessionTable] = Relationship(back_populates="appointments")
    payment: Optional["PaymentTable"] = Relationship(
        sa_relationship_kwargs={"uselist": False},  # 1-to-1 relationship
        back_populates="appointment"
    )

class PaymentTable(SQLModel, table=True):
    __tablename__ = "payments"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    appointment_id: str = Field(foreign_key="appointments.id")
    txid: str = Field(index=True, unique=True)  # Pix transaction ID
    amount: float
    status: str = Field(default="pending")  # pending, paid, expired
    qr_code_payload: str  # Pix copy and paste
    qr_code_image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    paid_at: Optional[datetime] = None
    
    appointment: AppointmentTable = Relationship(back_populates="payment")

class FAQTable(SQLModel, table=True):
    __tablename__ = "faq"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    category: str
    question: str
    answer: str
    is_active: bool = Field(default=True)


class SiteContentTable(SQLModel, table=True):
    __tablename__ = "site_content"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    key: str = Field(index=True, unique=True)
    value: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PDFProductTable(SQLModel, table=True):
    __tablename__ = "pdf_products"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    title: str
    description: str
    price: float
    payment_link: str
    download_url: str
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PurchaseTable(SQLModel, table=True):
    __tablename__ = "purchases"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    product_id: str = Field(foreign_key="pdf_products.id")
    email: str
    status: str = Field(default="pending")  # pending, paid
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    paid_at: Optional[datetime] = None

