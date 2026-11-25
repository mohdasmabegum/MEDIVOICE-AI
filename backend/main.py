"""
MediVoice AI — FastAPI Backend
Provides REST API + WebSocket /ws/call for Pipecat voice pipeline.
"""

import os
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Depends, Query, WebSocket, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.config import HOST, PORT, FRONTEND_URL, is_gemini_configured, is_elevenlabs_configured, get_safe_status
from backend.database import init_db, get_db, DoctorModel, AppointmentModel, CallRecordModel
from backend.services.appointment_service import (
    check_doctor_availability,
    book_appointment,
    cancel_appointment,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s — %(message)s",
)
logger = logging.getLogger("medivoice.main")


# ── App Lifespan ──────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    logger.info("MediVoice AI backend starting up…")
    init_db()
    logger.info("Database initialised.")
    yield
    logger.info("MediVoice AI backend shut down.")


app = FastAPI(
    title="MediVoice AI API",
    description="Conversational Healthcare AI Platform — Gemini + ElevenLabs + Pipecat",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow local dev, all Vercel preview deployments, and deployed Render frontend
_cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "https://medivoice-ai-one.vercel.app",
]
# Add any explicitly configured frontend URLs from FRONTEND_URL env var
for _origin in FRONTEND_URL.split(","):
    _cleaned = _origin.strip().rstrip("/")
    if _cleaned and _cleaned not in _cors_origins:
        _cors_origins.append(_cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex=r"https://medivoice.*\.vercel\.app",
)


# ── Pydantic Request Models ───────────────────────────────────────────────────

class BookAppointmentRequest(BaseModel):
    patientName: str = Field(..., description="Patient full name")
    patientPhone: str = Field(..., description="Patient phone number")
    doctorId: str = Field(..., description="Doctor ID")
    slot: str = Field(..., description="Time slot e.g. '02:30 PM'")
    symptoms: Optional[str] = "Consultation via MediVoice AI"


class CancelAppointmentRequest(BaseModel):
    bookingId: Optional[str] = Field(None, description="Booking reference ID")
    patientPhone: Optional[str] = Field(None, description="Patient phone (alias: phone)")
    phone: Optional[str] = Field(None, description="Patient phone (alias: patientPhone)")
    reason: Optional[str] = "Patient verbal cancellation via MediVoice AI"


class ChatRequest(BaseModel):
    messages: List[dict]


class TTSRequest(BaseModel):
    text: str
    voiceId: Optional[str] = None


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    try:
        doc_count = db.query(DoctorModel).count()
        apt_count = db.query(AppointmentModel).count()
        db_status = "connected"
    except Exception as exc:
        doc_count = apt_count = 0
        db_status = f"error: {exc}"

    return {
        "online": True,
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "MediVoice-Pipecat v1.0.0",
        "websocketEndpoint": "/ws/call",
        "webrtcReady": True,
        # Top-level for frontend compatibility
        "geminiConfigured": is_gemini_configured(),
        "elevenlabsConfigured": is_elevenlabs_configured(),
        "database": {
            "status": db_status,
            "doctorsCount": doc_count,
            "appointmentsCount": apt_count,
        },
        "services": {
            "geminiConfigured": is_gemini_configured(),
            "elevenlabsConfigured": is_elevenlabs_configured(),
        },
    }


# ── Dashboard & Admin Stats ───────────────────────────────────────────────────

@app.get("/api/admin/statistics")
@app.get("/api/stats")
def get_admin_statistics(db: Session = Depends(get_db)):
    doctors = db.query(DoctorModel).all()
    appointments = db.query(AppointmentModel).all()
    calls = db.query(CallRecordModel).all()

    available_doctors = sum(
        1 for d in doctors
        if d.status == "available" and len(json.loads(d.slots_today or "[]")) > 0
    )
    today_appointments = sum(1 for a in appointments if a.status != "cancelled")
    completed = sum(1 for a in appointments if a.status == "completed")
    cancelled = sum(1 for a in appointments if a.status == "cancelled")

    return {
        "totalDoctors": len(doctors) or 24,
        "availableDoctors": available_doctors,
        "todayAppointments": today_appointments,
        "completedAppointments": completed,
        "cancelledAppointments": cancelled,
        "totalCallsToday": len(calls) + today_appointments,
        "aiHandledRatePercentage": 96.2,
        "avgCallDurationSeconds": 108,
    }


# ── Doctors ───────────────────────────────────────────────────────────────────

@app.get("/api/doctors")
def get_doctors(
    specialization: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(DoctorModel)
    if specialization and isinstance(specialization, str):
        query = query.filter(DoctorModel.specialization.ilike(f"%{specialization}%"))
    if status and isinstance(status, str):
        query = query.filter(DoctorModel.status == status)
    return [doc.to_dict() for doc in query.all()]


@app.get("/api/doctors/availability")
def get_doctors_availability(
    specialization: Optional[str] = None,
    doctorName: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query_term = doctorName if isinstance(doctorName, str) else (specialization if isinstance(specialization, str) else None)
    res = check_doctor_availability(doctor_name_or_specialization=query_term, db=db)
    return res


# ── Appointments ──────────────────────────────────────────────────────────────

@app.get("/api/appointments")
def get_appointments(
    status: Optional[str] = None,
    patientPhone: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(AppointmentModel)
    if status and isinstance(status, str):
        query = query.filter(AppointmentModel.status == status)
    if patientPhone and isinstance(patientPhone, str):
        query = query.filter(AppointmentModel.patient_phone.contains(patientPhone))
    return [a.to_dict() for a in query.order_by(AppointmentModel.created_at.desc()).all()]


@app.get("/api/appointments/{id}")
def get_appointment_by_id(id: str, db: Session = Depends(get_db)):
    apt = db.query(AppointmentModel).filter(AppointmentModel.id == id).first()
    if not apt:
        raise HTTPException(status_code=404, detail=f"Appointment '{id}' not found")
    return apt.to_dict()


# ── Call Records ──────────────────────────────────────────────────────────────

@app.get("/api/calls")
def get_call_records(db: Session = Depends(get_db)):
    return [c.to_dict() for c in db.query(CallRecordModel).all()]


# ── Booking ───────────────────────────────────────────────────────────────────

@app.post("/api/appointments")
@app.post("/api/appointments/book")
def api_book_appointment(req: BookAppointmentRequest, db: Session = Depends(get_db)):
    result = book_appointment(
        patient_name=req.patientName,
        patient_phone=req.patientPhone,
        doctor_id=req.doctorId,
        slot=req.slot,
        symptoms=req.symptoms,
        db=db,
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Booking failed"))
    return result.get("booking")


# ── Cancellation ──────────────────────────────────────────────────────────────

@app.post("/api/appointments/{id}/cancel")
def api_cancel_appointment_by_id(
    id: str,
    req: Optional[CancelAppointmentRequest] = None,
    db: Session = Depends(get_db),
):
    phone = req.patientPhone or req.phone if req else None
    reason = req.reason if req else "Patient verbal cancellation via MediVoice AI"
    result = cancel_appointment(
        booking_id=id,
        phone=phone,
        reason=reason,
        db=db,
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Cancellation failed"))
    return result.get("cancellation")


@app.post("/api/appointments/cancel")
def api_cancel_appointment(req: CancelAppointmentRequest, db: Session = Depends(get_db)):
    phone = req.patientPhone or req.phone
    result = cancel_appointment(
        booking_id=req.bookingId,
        phone=phone,
        reason=req.reason,
        db=db,
    )
    if not result.get("success"):
        if result.get("multiple"):
            return {
                "multiple": True,
                "appointments": result.get("appointments"),
                "message": result.get("error"),
            }
        raise HTTPException(status_code=400, detail=result.get("error", "Cancellation failed"))
    return result.get("cancellation")


# ── Gemini Chat (REST fallback) ───────────────────────────────────────────────

@app.post("/api/chat")
def api_chat(req: ChatRequest):
    from backend.services.gemini_service import gemini_service as gs
    return gs.chat(req.messages)


# ── ElevenLabs TTS (REST) ─────────────────────────────────────────────────────

@app.post("/api/voice/tts")
def api_voice_tts(req: TTSRequest):
    from backend.services.elevenlabs_service import elevenlabs_service as el
    voice_id = req.voiceId or "Xb7hH8MSUJpSbSDYk0k2"
    res = el.text_to_speech(req.text, voice_id=voice_id)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "TTS synthesis failed"))
    return Response(
        content=res["audio_bytes"],
        media_type=res.get("content_type", "audio/mpeg"),
    )


# ── ElevenLabs STT (REST) ─────────────────────────────────────────────────────

@app.post("/api/voice/stt")
async def api_voice_stt(file: UploadFile = File(...)):
    from backend.services.elevenlabs_service import elevenlabs_service as el
    audio_data = await file.read()
    res = el.speech_to_text(audio_data, filename=file.filename or "audio.webm")
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "STT transcription failed"))
    return {"text": res.get("text", "")}


# ── Pipecat WebSocket Voice Pipeline ─────────────────────────────────────────

@app.websocket("/ws/call")
async def websocket_voice_pipeline(websocket: WebSocket):
    from backend.pipeline.pipecat_pipeline import handle_pipecat_websocket
    await handle_pipecat_websocket(websocket)


# ── Entry Point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host=HOST,
        port=PORT,
        reload=False,
        log_level="info",
    )
