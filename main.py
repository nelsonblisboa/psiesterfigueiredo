import os
import secrets
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel
from sqlmodel import SQLModel, Session, select
from database import engine
from models import SessionTable, ChatMessageTable, AppointmentTable, PaymentTable, FAQTable, SiteContentTable, PDFProductTable, PurchaseTable
from chatbot import get_chatbot_response

class AppointmentCreate(BaseModel):
    name: str
    email: str
    whatsapp: str
    date: str  # YYYY-MM-DD format
    time: str  # HH:MM format
    session_id: Optional[str] = None


class AdminLoginRequest(BaseModel):
    password: str


class SiteContentUpdate(BaseModel):
    key: str
    value: str


class PDFProductCreate(BaseModel):
    title: str
    description: str
    price: float
    payment_link: str
    download_url: str
    is_active: bool = True


class PurchaseCreate(BaseModel):
    product_id: str
    email: str



# Initialize database tables in Supabase
SQLModel.metadata.create_all(engine)

# Seed default site content on startup
with Session(engine) as startup_session:
    try:
        stmt = select(SiteContentTable)
        if not startup_session.exec(stmt).first():
            defaults = [
                SiteContentTable(key="hero_title", value="Criando caminhos de leveza e propósito."),
                SiteContentTable(key="hero_desc", value="Um espaço seguro e acolhedor para o seu processo terapêutico. Atendimento online para todo o Brasil e brasileiros no exterior."),
                SiteContentTable(key="about_title", value="Muito prazer!"),
                SiteContentTable(key="about_content", value='<p>Sou psicóloga, mas não só isso. Minha bagagem também passa pela comunicação, mídias sociais e pela paixão por processos criativos.</p><p>Tenho prática clínica e na saúde, com mulheres e público 60+.</p><p>Acredito que viver é um percurso em construção. Que nenhuma história é reta, nenhuma dor é definitiva e nenhum caminho é percorrido sozinho. Que transformar não é apagar marcas, mas ressignificá-las.</p><p>Escolho uma psicologia que não encaixa pessoas em moldes, mas as convida a florescer no próprio ritmo. Meu propósito é criar caminhos de leveza, onde cada passo, mesmo difícil, possa carregar sentido, presença e esperança.</p>'),
                SiteContentTable(key="about_footer", value="Formada pela Faculdade Estácio de Sá — Pós-graduanda"),
                SiteContentTable(key="about_img", value="https://lh3.googleusercontent.com/aida-public/AB6AXuA0Cy4cegf_snE5C1lWCj6vZyxTWNruYAHk1UnxpSUYuTd0l9nVbA4BCI-a9DppeiXPivkhUuaA3ed1CGoTad1anEbbQ1TOiYfI7Ak2SQ6TQP5Kz22exuTCIn2FI85DzQC5A4z54pAcLDneiPXUBM9C9pw_AdaLdVfGpHbgQYEp60Bj8QWOEQ4HgvDXUy9woCAV6nP-8GEmE3lP8g5ZcynTdtK4XlFCSKFcnwVkkvmuEyY8emuRVEnroSI1X33fdPPbOfxMjTnkHe8")
            ]
            for d in defaults:
                startup_session.add(d)
            startup_session.commit()
    except Exception as e:
        print(f"Error seeding default content: {e}")


app = FastAPI(
    title="Virtual Assistant API - Dra. Ester Figueiredo",
    description="Backend API supporting database persistence and AI chatbot orchestration"
)

# Security: CORS restricted to allowed origins
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173,https://psiesterfigueiredo.com.br").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

# Security: Rate limiting simple in-memory store
_rate_limit_store = {}
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = 30  # max requests per window

def check_rate_limit(client_ip: str) -> bool:
    now = datetime.now(timezone.utc).timestamp()
    if client_ip not in _rate_limit_store:
        _rate_limit_store[client_ip] = []
    _rate_limit_store[client_ip] = [t for t in _rate_limit_store[client_ip] if now - t < RATE_LIMIT_WINDOW]
    if len(_rate_limit_store[client_ip]) >= RATE_LIMIT_MAX:
        return False
    _rate_limit_store[client_ip].append(now)
    return True

class ChatRequest(BaseModel):
    user_identifier: str
    message: str

class ChatResponse(BaseModel):
    response: str

# Helper dependency to get database session
def get_db():
    with Session(engine) as session:
        yield session

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Virtual Assistant API is running"}

@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(payload: ChatRequest, db: Session = Depends(get_db)):
    user_id = payload.user_identifier
    user_msg = payload.message
    
    if not user_id or not user_msg:
        raise HTTPException(status_code=400, detail="user_identifier and message are required")
    
    # 1. Fetch or create session
    statement = select(SessionTable).where(SessionTable.user_identifier == user_id)
    session_row = db.exec(statement).first()
    if not session_row:
        session_row = SessionTable(user_identifier=user_id)
        db.add(session_row)
        db.commit()
        db.refresh(session_row)
    else:
        # Update last active time
        session_row.last_active_at = datetime.now(timezone.utc)
        db.add(session_row)
        db.commit()
        db.refresh(session_row)
        
    # 2. Retrieve last 10 messages from history to keep LLM context
    history_stmt = select(ChatMessageTable).where(ChatMessageTable.session_id == session_row.id).order_by(ChatMessageTable.created_at.desc()).limit(10)
    history_messages = db.exec(history_stmt).all()
    # Reverse to keep chronological order
    history_messages.reverse()
    
    chat_history = []
    for h in history_messages:
        chat_history.append({"role": h.role, "content": h.content})
        
    # 3. Call Chatbot to get AI response with current date and occupied slots context
    brazil_tz = timezone(timedelta(hours=-3))
    now_brazil = datetime.now(brazil_tz)
    current_date_str = now_brazil.strftime("%Y-%m-%d %H:%M (Horário de Brasília)")
    today_brazil = now_brazil.date()
    
    # Query active appointments for the next 14 days
    end_date_brazil = today_brazil + timedelta(days=14)
    appt_stmt = select(AppointmentTable).where(
        AppointmentTable.status != "cancelled",
        AppointmentTable.date >= today_brazil,
        AppointmentTable.date <= end_date_brazil
    ).order_by(AppointmentTable.date, AppointmentTable.time)
    appointments = db.exec(appt_stmt).all()
    
    occupied_slots = []
    for appt in appointments:
        occupied_slots.append({
            "date": appt.date.isoformat() if isinstance(appt.date, date) else str(appt.date),
            "time": appt.time
        })
        
    ai_response = get_chatbot_response(
        user_message=user_msg,
        chat_history=chat_history,
        current_date=current_date_str,
        occupied_slots=occupied_slots
    )
    
    # 4. Persist messages to history
    user_db_msg = ChatMessageTable(
        session_id=session_row.id,
        role="user",
        content=user_msg
    )
    ai_db_msg = ChatMessageTable(
        session_id=session_row.id,
        role="assistant",
        content=ai_response
    )
    db.add(user_db_msg)
    db.add(ai_db_msg)
    db.commit()
    
    return ChatResponse(response=ai_response)

@app.get("/api/appointments")
def get_appointments_endpoint(db: Session = Depends(get_db)):
    statement = select(AppointmentTable).where(AppointmentTable.status != "cancelled")
    appointments = db.exec(statement).all()
    results = []
    for appt in appointments:
        results.append({
            "id": appt.id,
            "name": appt.name,
            "email": appt.email,
            "whatsapp": appt.whatsapp,
            "date": appt.date.isoformat() if isinstance(appt.date, date) else str(appt.date),
            "time": appt.time,
            "status": appt.status,
            "session_id": appt.session_id
        })
    return results

@app.post("/api/appointments")
def create_appointment_endpoint(payload: AppointmentCreate, db: Session = Depends(get_db)):
    try:
        booking_date = datetime.strptime(payload.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de data inválido. Use YYYY-MM-DD")
        
    statement = select(AppointmentTable).where(
        AppointmentTable.date == booking_date,
        AppointmentTable.time == payload.time,
        AppointmentTable.status != "cancelled"
    )
    existing = db.exec(statement).first()
    if existing:
        raise HTTPException(status_code=400, detail="Este horário já está reservado")

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    db_appointment = AppointmentTable(
        name=payload.name,
        email=payload.email,
        whatsapp=payload.whatsapp,
        date=booking_date,
        time=payload.time,
        session_id=payload.session_id,
        status="confirmed",
        expires_at=expires_at
    )
    
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    
    return {
        "id": db_appointment.id,
        "name": db_appointment.name,
        "email": db_appointment.email,
        "whatsapp": db_appointment.whatsapp,
        "date": db_appointment.date.isoformat(),
        "time": db_appointment.time,
        "status": db_appointment.status
    }

@app.delete("/api/appointments/{appointment_id}")
def cancel_appointment_endpoint(appointment_id: str, db: Session = Depends(get_db)):
    statement = select(AppointmentTable).where(AppointmentTable.id == appointment_id)
    appointment = db.exec(statement).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
        
    appointment.status = "cancelled"
    db.add(appointment)
    db.commit()
    return {"status": "success", "message": "Agendamento cancelado com sucesso"}

@app.get("/api/faq")
def get_faq_endpoint(db: Session = Depends(get_db)):
    statement = select(FAQTable).where(FAQTable.is_active == True)
    faqs = db.exec(statement).all()
    return faqs

@app.post("/api/faq/seed")
def seed_faq_endpoint(db: Session = Depends(get_db)):
    seeds = [
        FAQTable(
            category="Valores",
            question="Qual é o valor da sessão?",
            answer="O valor da sessão individual avulsa é R$ 80,00. Também oferecemos um plano mensal estruturado de 4 sessões por R$ 300,00."
        ),
        FAQTable(
            category="Agendamento",
            question="Como posso agendar uma consulta?",
            answer="Você pode agendar de forma simples pela seção 'Agendamento Online' na nossa página inicial ou solicitar diretamente para mim aqui no chat."
        ),
        FAQTable(
            category="Convênio",
            question="Aceita convênio médico?",
            answer="Os atendimentos no consultório são particulares. No entanto, emitimos recibos e notas fiscais completos para que você solicite o reembolso integral ou parcial junto ao seu plano de saúde."
        ),
        FAQTable(
            category="Localização",
            question="Onde fica o consultório?",
            answer="Nosso consultório físico fica em Nova Iguaçu, RJ. Mas também realizamos atendimentos online por videochamada para todo o Brasil e para brasileiros residentes no exterior."
        )
    ]
    added_count = 0
    for item in seeds:
        existing = db.exec(select(FAQTable).where(FAQTable.question == item.question)).first()
        if not existing:
            db.add(item)
            added_count += 1
            
    if added_count > 0:
        db.commit()
        return {"message": f"FAQ seeded successfully. Added {added_count} items."}
    else:
        return {"message": "FAQ already seeded. No new items added."}


# ==========================================
# ADMIN & PDF SALES SYSTEM
# ==========================================

def verify_admin(authorization: Optional[str] = Header(None)):
    admin_password = os.getenv("ADMIN_PASSWORD")
    if not admin_password:
        raise HTTPException(status_code=500, detail="ADMIN_PASSWORD not configured")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token de autenticação necessário")
    token = authorization.replace("Bearer ", "")
    if token != admin_password:
        raise HTTPException(status_code=401, detail="Acesso não autorizado")
    return True


@app.post("/api/admin/login")
def admin_login(payload: AdminLoginRequest, request=None):
    admin_password = os.getenv("ADMIN_PASSWORD")
    if not admin_password:
        raise HTTPException(status_code=500, detail="ADMIN_PASSWORD not configured")
    if payload.password != admin_password:
        raise HTTPException(status_code=401, detail="Senha incorreta")
    # Generate a time-limited token (the password itself serves as token in this simple impl)
    # In production, use JWT with expiration
    return {"token": payload.password, "expires_in": 3600}


@app.get("/api/admin/site-content")
def get_site_content(db: Session = Depends(get_db)):
    stmt = select(SiteContentTable)
    items = db.exec(stmt).all()
    return {item.key: item.value for item in items}


@app.post("/api/admin/site-content")
def update_site_content(payload: List[SiteContentUpdate], db: Session = Depends(get_db), authenticated: bool = Depends(verify_admin)):
    for item in payload:
        stmt = select(SiteContentTable).where(SiteContentTable.key == item.key)
        existing = db.exec(stmt).first()
        if existing:
            existing.value = item.value
            existing.updated_at = datetime.now(timezone.utc)
            db.add(existing)
        else:
            new_item = SiteContentTable(key=item.key, value=item.value)
            db.add(new_item)
    db.commit()
    return {"status": "success"}


@app.get("/api/admin/pdf-products")
def get_pdf_products(db: Session = Depends(get_db)):
    stmt = select(PDFProductTable)
    return db.exec(stmt).all()


@app.post("/api/admin/pdf-products")
def create_pdf_product(payload: PDFProductCreate, db: Session = Depends(get_db), authenticated: bool = Depends(verify_admin)):
    new_product = PDFProductTable(
        title=payload.title,
        description=payload.description,
        price=payload.price,
        payment_link=payload.payment_link,
        download_url=payload.download_url,
        is_active=payload.is_active
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product


@app.put("/api/admin/pdf-products/{product_id}")
def update_pdf_product(product_id: str, payload: PDFProductCreate, db: Session = Depends(get_db), authenticated: bool = Depends(verify_admin)):
    stmt = select(PDFProductTable).where(PDFProductTable.id == product_id)
    product = db.exec(stmt).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    product.title = payload.title
    product.description = payload.description
    product.price = payload.price
    product.payment_link = payload.payment_link
    product.download_url = payload.download_url
    product.is_active = payload.is_active
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@app.delete("/api/admin/pdf-products/{product_id}")
def delete_pdf_product(product_id: str, db: Session = Depends(get_db), authenticated: bool = Depends(verify_admin)):
    stmt = select(PDFProductTable).where(PDFProductTable.id == product_id)
    product = db.exec(stmt).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    db.delete(product)
    db.commit()
    return {"status": "success"}


@app.get("/api/admin/purchases")
def get_purchases(db: Session = Depends(get_db), authenticated: bool = Depends(verify_admin)):
    stmt = select(PurchaseTable)
    purchases = db.exec(stmt).all()
    results = []
    for p in purchases:
        prod = db.exec(select(PDFProductTable).where(PDFProductTable.id == p.product_id)).first()
        results.append({
            "id": p.id,
            "product_title": prod.title if prod else "Produto Excluído",
            "email": p.email,
            "status": p.status,
            "created_at": p.created_at.isoformat(),
            "paid_at": p.paid_at.isoformat() if p.paid_at else None
        })
    return results


@app.post("/api/purchases")
def create_purchase(payload: PurchaseCreate, db: Session = Depends(get_db)):
    prod = db.exec(select(PDFProductTable).where(PDFProductTable.id == payload.product_id)).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    new_purchase = PurchaseTable(
        product_id=payload.product_id,
        email=payload.email,
        status="pending"
    )
    db.add(new_purchase)
    db.commit()
    db.refresh(new_purchase)
    
    return {
        "purchase_id": new_purchase.id,
        "payment_link": prod.payment_link,
        "price": prod.price
    }


@app.post("/api/purchases/{purchase_id}/confirm")
def confirm_purchase(purchase_id: str, db: Session = Depends(get_db)):
    stmt = select(PurchaseTable).where(PurchaseTable.id == purchase_id)
    purchase = db.exec(stmt).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Compra não encontrada")
    
    if purchase.status == "paid":
        return {"status": "already_paid"}
        
    prod = db.exec(select(PDFProductTable).where(PDFProductTable.id == purchase.product_id)).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Produto associado não encontrado")
        
    purchase.status = "paid"
    purchase.paid_at = datetime.now(timezone.utc)
    db.add(purchase)
    db.commit()
    
    email_subject = f"Seu material digital: {prod.title} está pronto para download!"
    email_body = f"Olá!\nObrigado pelo seu pagamento de R$ {prod.price:.2f}.\nSeu material '{prod.title}' está liberado.\n\nVocê pode baixá-lo a qualquer momento através do link abaixo:\n{prod.download_url}\n\nAtenciosamente,\nDra. Ester Figueiredo\n"
    
    sent_emails_path = os.path.join(os.path.dirname(__file__), "sent_emails.txt")
    with open(sent_emails_path, "a", encoding="utf-8") as f:
        f.write("="*50 + "\n")
        f.write(f"DATE: {datetime.now(timezone.utc).isoformat()}\n")
        f.write(f"TO: {purchase.email}\n")
        f.write(f"SUBJECT: {email_subject}\n")
        f.write(f"BODY:\n{email_body}\n")
        f.write("="*50 + "\n\n")
        
    return {
        "status": "confirmed",
        "email_sent_to": purchase.email,
        "download_url": prod.download_url
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

