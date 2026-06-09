import os
import re
from openai import OpenAI
from sqlmodel import Session, select
from database import engine
from models import FAQTable

# Load OpenRouter API Key
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY
)

# Crisis Protocol Trigger Keywords
CRISIS_KEYWORDS = [
    r"\bpanico\b", r"\bpânico\b", r"\bsuicid\b", r"\bme matar\b", r"\bquero morrer\b",
    r"\bacabar com a minha vida\b", r"\bcortar\b", r"\bcrise de ansiedade\b", 
    r"\bfalta de ar\b", r"\basfixia\b", r"\bdesespero\b", r"\binfartando\b",
    r"\bmorrendo\b", r"\bcoracao acelerado\b", r"\bcoração acelerado\b",
    r"\bataque de panico\b", r"\bataque de pânico\b"
]

CRISIS_RESPONSE = """[PROTOCOL_TRIGGER: CRISIS_RESPIRATION]
Percebo que você pode estar passando por um momento difícil ou uma crise de ansiedade agora. Respire fundo, estou aqui com você. Vamos fazer juntos um exercício simples de respiração para ajudar a acalmar o corpo (Respiração Quadrada):

1. **Inspire** devagar pelo nariz contando até **4**...
2. **Segure** o ar nos pulmões contando até **4**...
3. **Expire** suavemente pela boca contando até **4**...
4. **Mantenha os pulmões vazios** contando até **4**...

Repita esse ciclo de 3 a 5 vezes. Se você estiver em sofrimento extremo e precisar de ajuda humana imediata, lembre-se de que o **Centro de Valorização da Vida (CVV)** atende gratuitamente pelo telefone **188** (24 horas). Você está em segurança. Podemos continuar conversando assim que se sentir melhor."""

def detect_crisis(user_message: str) -> bool:
    message_clean = user_message.lower()
    for pattern in CRISIS_KEYWORDS:
        if re.search(pattern, message_clean):
            return True
    return False

def get_faq_context() -> str:
    try:
        with Session(engine) as session:
            faqs = session.exec(select(FAQTable).where(FAQTable.is_active == True)).all()
            if not faqs:
                return "Nenhuma informação de FAQ cadastrada."
            
            context_lines = []
            for faq in faqs:
                context_lines.append(f"Pergunta: {faq.question}\nResposta: {faq.answer}")
            return "\n\n".join(context_lines)
    except Exception as e:
        print(f"Error fetching FAQs: {e}")
        return "Nenhuma informação de FAQ cadastrada devido a um erro de banco de dados."

def get_first_available_slot_raw(occupied_slots: list) -> tuple:
    from datetime import datetime, timedelta, timezone
    # Brazil timezone
    brazil_tz = timezone(timedelta(hours=-3))
    now = datetime.now(brazil_tz)
    
    occupied_set = set()
    if occupied_slots:
        for slot in occupied_slots:
            occupied_set.add((slot["date"], slot["time"]))
            
    # Working hours:
    # Mon-Fri: 08:00 to 12:00, 14:00 to 20:00 (last session starts at 19:00).
    # Saturday: 08:00 to 12:00 (last session at 11:00).
    weekday_slots = ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"]
    saturday_slots = ["08:00", "09:00", "10:00", "11:00"]
    
    for day_offset in range(15):  # check next 15 days
        check_day = now + timedelta(days=day_offset)
        # Sunday is closed
        if check_day.weekday() == 6:
            continue
            
        day_str = check_day.strftime("%Y-%m-%d")
        slots = saturday_slots if check_day.weekday() == 5 else weekday_slots
        
        for slot_time in slots:
            slot_dt_str = f"{day_str} {slot_time}"
            slot_dt = datetime.strptime(slot_dt_str, "%Y-%m-%d %H:%M").replace(tzinfo=brazil_tz)
            if slot_dt <= now:
                continue
                
            if (day_str, slot_time) not in occupied_set:
                return day_str, slot_time
                
    # Fallback if somehow full
    tomorrow = now + timedelta(days=1)
    return tomorrow.strftime("%Y-%m-%d"), "08:00"

def get_first_available_slot_friendly(occupied_slots: list) -> str:
    from datetime import datetime
    day_str, slot_time = get_first_available_slot_raw(occupied_slots)
    
    # Format to friendly string
    dt_obj = datetime.strptime(day_str, "%Y-%m-%d")
    weekday_names = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]
    day_name = weekday_names[dt_obj.weekday()]
    return f"{day_name}, {dt_obj.strftime('%d/%m/%Y')} às {slot_time}"

def get_chatbot_response(user_message: str, chat_history: list, current_date: str = None, occupied_slots: list = None) -> str:
    from datetime import datetime
    
    # 1. Immediate Crisis Check in Python
    if detect_crisis(user_message):
        return CRISIS_RESPONSE
    
    # 2. Get FAQ Context from DB
    faq_context = get_faq_context()
    
    # Format occupied slots for the prompt context
    if occupied_slots:
        slots_by_date = {}
        for slot in occupied_slots:
            d = slot["date"]
            t = slot["time"]
            if d not in slots_by_date:
                slots_by_date[d] = []
            slots_by_date[d].append(t)
            
        slots_lines = []
        for d, times in sorted(slots_by_date.items()):
            try:
                dt_obj = datetime.strptime(d, "%Y-%m-%d")
                d_formatted = dt_obj.strftime("%d/%m/%Y")
            except Exception:
                d_formatted = d
            slots_lines.append(f"- {d_formatted}: {', '.join(sorted(times))}")
        occupied_context = "\n".join(slots_lines)
    else:
        occupied_context = "Nenhum horário ocupado registrado nos próximos 14 dias."
        
    # 3. Build System Prompt
    first_friendly = get_first_available_slot_friendly(occupied_slots)
    first_raw_date, first_raw_time = get_first_available_slot_raw(occupied_slots)
    
    system_prompt = f"""Você é a LINA, a assistente virtual inteligente e acolhedora do consultório de psicologia da Dra. Ester Figueiredo.
Seu objetivo principal é realizar a triagem, o agendamento de consultas e tirar dúvidas dos pacientes de forma fluida, ágil e extremamente natural, simulando o comportamento de uma secretária humana dedicada.

Dra. Ester:
- CRP: 05/87164
- Atendimento: Híbrido (Online por videochamada para todo o Brasil ou Presencial em Nova Iguaçu, RJ).
- Abordagem: Terapia Cognitivo-Comportamental (TCC) e Terapias Contextuais (ACT).

Data/Hora Atual do Sistema:
{current_date or 'Não fornecida'}

Primeiro Horário Disponível na Agenda (caso o paciente pergunte ou queira o primeiro horário, proponha EXATAMENTE este):
{first_friendly} (Data: {first_raw_date} | Hora: {first_raw_time})

Lista de Horários OCUPADOS nos próximos 14 dias (os pacientes NÃO podem agendar nestes horários):
{occupied_context}

Os horários de funcionamento padrão do consultório para atendimento são de segunda a sexta das 08:00 às 12:00 (Turno da Manhã) e das 14:00 às 20:00 (Turno da Tarde/Noite, última sessão começa às 19:00), e aos sábados das 08:00 às 12:00 (última sessão às 11:00). Aos domingos o consultório fica fechado.

FAQ cadastrado no banco de dados para consulta:
{faq_context}

### 🧠 DIRETRIZES DE PERSONALIDADE E TOM DE VOZ
- **Linguagem Natural:** Fale de forma leve e calorosa, mas profissional. Evite termos excessivamente robóticos como "Selecione uma opção" ou menus numéricos (Digite 1, Digite 2). Converse por meio de perguntas diretas.
- **Formato das Mensagens:** Use frases curtas (máximo de 15 palavras por frase). Use quebras de linha frequentes (use '\\n') para simular o ritmo de digitação do WhatsApp.
- **Identidade Clara:** Você é uma inteligência artificial que atua como assistente digital da clínica. Não simule sentimentos humanos reais (como "estou triste"), mas demonstre empatia legítima com a situação do paciente.
- **Variabilidade:** Nunca repita as mesmas saudações ou conectivos em sequência. Varie entre "Oi", "Olá", "Tudo bem?", "Lina aqui", "Perfeito", "Legal", "Combinado".
- **Foco na Privacidade:** Mantenha total discrição. Nunca faça perguntas íntimas sobre o motivo da terapia; foque apenas na parte logística e de acolhimento.

### 🏥 INFORMAÇÕES CRUCIAIS DA CLÍNICA
- **Modalidade:** As consultas são híbridas (podem ser Online por videochamada ou Presenciais na clínica).
- **Modelo Financeiro:** Atendimento focado EXCLUSIVAMENTE em formato PARTICULAR.
- **Valor da Sessão:** R$ 80,00 por sessão (duração aproximada de 50 minutos).
- **Formas de Pagamento:** Aceitas apenas via PIX ou Cartão (crédito/débito).
- **Convênios:** A clínica NÃO atende convênios diretamente. Caso o paciente pergunte, informe que emitimos recibo para ele solicitar o reembolso com o plano de saúde dele.

### 🚫 RESTRIÇÕES ABSOLUTAS (O que você NUNCA deve fazer)
1. NUNCA dê conselhos psicológicos, palpites terapêuticos ou faça pré-diagnósticos. Se o paciente desabafar, acolha brevemente com empatia e foque no agendamento com o profissional.
2. NUNCA passe dados de pagamento (Chave Pix ou Link de Cartão) antes de o paciente escolher e confirmar um horário específico.
3. NUNCA envie mais de duas opções de horários de uma vez para não confundir o paciente. Verifique na lista de ocupados acima quais horários do turno escolhido estão livres e envie no máximo 2 opções livres de cada vez.
4. Se o paciente demonstrar pressa, ansiedade severa ou irritação, reduza o uso de emojis e adote um tom ainda mais direto, focado na solução rápida.

### 🔄 FLUXO PADRÃO DE ATENDIMENTO (Siga este fluxo passo a passo)
Passo 1. **Saudação e Triagem de Formato:** Cumprimente o paciente, apresente-se como Lina e pergunte se ele prefere atendimento Online ou Presencial, e qual o turno de preferência (manhã ou tarde).
Passo 2. **Apresentação de Vagas:** Com base no formato e turno escolhidos, verifique na lista de ocupados acima quais horários estão livres na data mais próxima e ofereça exatamente duas opções de horários.
Passo 3. **Coleta de Dados:** Assim que o paciente escolher um dos horários, peça o nome completo e o e-mail dele para realizar o cadastro.
Passo 4. **Alinhamento Financeiro:** Confirme o horário e informe o valor de R$ 80,00. Pergunte se ele prefere pagar por Pix ou Cartão.
Passo 5. **Fechamento:** Envie as instruções finais (endereço físico ou informação sobre o link da videochamada que será enviado no dia) e confirme o agendamento.
Para agendamentos confirmados: você DEVE incluir a seguinte tag EXATA no final da sua resposta (na última linha) para que o system_prompt registre a reserva no banco de dados:
[SCHEDULE: Nome_do_Paciente | E-mail_do_Paciente | YYYY-MM-DD | HH:MM]
Substitua os dados reais do paciente nos placeholders. Exemplo: [SCHEDULE: João Silva | joao@gmail.com | 2026-06-15 | 14:00]
"""

    # Build messages array for API call
    messages = [{"role": "system", "content": system_prompt}]
    for msg in chat_history:
        # Support both object format and dict format
        role = msg.get("role") if isinstance(msg, dict) else getattr(msg, "role", "user")
        content = msg.get("content") if isinstance(msg, dict) else getattr(msg, "content", "")
        messages.append({"role": role, "content": content})
    
    # Add latest message if not present
    if not messages or messages[-1]["content"] != user_message:
        messages.append({"role": "user", "content": user_message})

    try:
        response = client.chat.completions.create(
            model="google/gemini-2.5-flash",
            messages=messages,
            temperature=0.7,
            max_tokens=800
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error calling OpenRouter: {e}")
        # Rule-based fallback matching database FAQs & handling booking state
        msg_lower = user_message.lower()
        
        user_msgs = [m["content"] for m in chat_history if m["role"] == "user"] + [user_message]
        
        is_scheduling = False
        for msg in user_msgs:
            m_low = msg.lower()
            if any(w in m_low for w in ["agendar", "agenda", "marcar", "consulta", "horario", "horário", "sessao", "sessão"]):
                is_scheduling = True
                break
                
        if is_scheduling:
            # 1. Search for email in user messages
            email = None
            name = None
            for msg in user_msgs:
                email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", msg)
                if email_match:
                    email = email_match.group(0)
                    # Try to extract name from this message
                    temp_name = msg.replace(email, "")
                    temp_name = re.sub(r"\b(meu|nome|é|e|email|e-mail|o|um|para|sou|o-mail|de)\b", "", temp_name, flags=re.IGNORECASE)
                    temp_name = re.sub(r"[,\-\:\n\r\t]", " ", temp_name)
                    parts = [p.strip() for p in temp_name.split() if p.strip()]
                    name = " ".join(parts)
                    if len(name) < 2:
                        idx = user_msgs.index(msg)
                        if idx > 0:
                            prev_msg = user_msgs[idx - 1]
                            if len(prev_msg) < 40 and not any(w in prev_msg.lower() for w in ["agendar", "agenda", "marcar", "consulta", "online", "presencial"]):
                                name = prev_msg.strip()
                    break
                    
            # 2. Search for modality preference
            modality = None
            for msg in user_msgs:
                m_low = msg.lower()
                if "online" in m_low or "videochamada" in m_low or "virtual" in m_low or "de casa" in m_low:
                    modality = "Online"
                    break
                elif "presencial" in m_low or "consultorio" in m_low or "consultório" in m_low or "físico" in m_low or "fisico" in m_low:
                    modality = "Presencial"
                    break
                    
            date_raw, time_raw = get_first_available_slot_raw(occupied_slots)
            friendly_slot = get_first_available_slot_friendly(occupied_slots)
            
            if email:
                final_name = name if (name and len(name) > 1) else "Paciente"
                return f"Muito obrigada! Seu agendamento foi registrado com sucesso para **{friendly_slot}** na modalidade {modality or 'Online'}.\nO valor da sessão é R$ 80,00. As instruções de acesso foram enviadas para seu e-mail.\nAté lá!\n\n[SCHEDULE: {final_name} | {email} | {date_raw} | {time_raw}]"
            elif modality:
                return f"Perfeito! Já deixei pré-reservado o horário de **{friendly_slot}** na modalidade {modality}.\nPara finalizar a reserva e registrar no sistema, poderia me informar o seu **Nome Completo** e seu **E-mail**?"
            else:
                return f"Oi! Claro, posso te ajudar a agendar.\nO primeiro horário disponível na agenda da Dra. Ester é **{friendly_slot}**.\nVocê prefere a modalidade **Online** ou **Presencial**?"

        # 1. Greetings (Saudações)
        if any(w in msg_lower for w in ["oi", "olá", "ola", "tudo bem", "como vai", "bom dia", "boa tarde", "boa noite"]):
            return "Oi! Tudo bem? Sou a Lina.\nComo estou operando em modo de compatibilidade no momento, posso te ajudar a entender sobre valores, localização, convênio ou agendamento de consultas.\nO que você gostaria de saber?"
            
        # 2. Thanks / Acceptance (Agradecimentos / Confirmações simples)
        if any(w in msg_lower for w in ["obrigado", "obrigada", "valeu", "entendi", "perfeito", "ótimo", "otimo", "ok", "certo", "combinado"]):
            return "Por nada! Fico à disposição.\nSe precisar de mais alguma informação, é só falar!"
            
        # 3. Farewells (Despedidas)
        if any(w in msg_lower for w in ["tchau", "adeus", "até logo", "ate logo", "fui", "abraço", "abraco"]):
            return "Tchau! Tenha um excelente dia e até logo!"
            
        # 5. Prices / Valores
        if any(w in msg_lower for w in ["valor", "preco", "preço", "custo", "quanto é", "quanto custa", "plano", "mensal"]):
            faq_ans = None
            try:
                with Session(engine) as session:
                    faq = session.exec(select(FAQTable).where(FAQTable.category == "Valores", FAQTable.is_active == True)).first()
                    if faq:
                        faq_ans = faq.answer
            except Exception:
                pass
            return faq_ans or "O valor da sessão avulsa é R$ 80,00. O plano mensal com 4 sessões custa R$ 300,00."
            
        # 6. Insurance / Convênio
        if any(w in msg_lower for w in ["convenio", "convênio", "plano de saude", "plano de saúde", "reembolso"]):
            faq_ans = None
            try:
                with Session(engine) as session:
                    faq = session.exec(select(FAQTable).where(FAQTable.category == "Convênio", FAQTable.is_active == True)).first()
                    if faq:
                        faq_ans = faq.answer
            except Exception:
                pass
            return faq_ans or "Os atendimentos no consultório são particulares. No entanto, emitimos recibos e notas fiscais para que você solicite o reembolso integral ou parcial junto ao seu plano de saúde."
            
        # 7. Location / Localização
        if any(w in msg_lower for w in ["onde", "fica", "local", "endereco", "endereço", "consultorio", "consultório", "nova iguacu", "nova iguaçu"]):
            faq_ans = None
            try:
                with Session(engine) as session:
                    faq = session.exec(select(FAQTable).where(FAQTable.category == "Localização", FAQTable.is_active == True)).first()
                    if faq:
                        faq_ans = faq.answer
            except Exception:
                pass
            return faq_ans or "Nosso consultório físico fica em Nova Iguaçu, RJ. Também realizamos atendimentos online por videochamada para todo o Brasil e exterior."
            
        # 8. Default friendly response when offline/fallback
        return "Para te ajudar melhor, como estou em modo simplificado, você pode perguntar sobre nossos valores, convênios, localização ou como realizar o agendamento da consulta."
