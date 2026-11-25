"""
MediVoice AI — Pipecat Voice Pipeline
Browser Mic → WebSocket → ElevenLabs STT → Gemini LLM → Functions → ElevenLabs TTS → Browser

Protocol (browser → backend JSON):
  { type: "init", callerPhone, callerName }
  { type: "audio_chunk", data: "<base64 webm audio>" }
  { type: "speech_end" }
  { type: "text_input", text: "..." }
  { type: "interrupt" }
  { type: "end_call" }

Protocol (backend → browser JSON):
  { type: "connection_ready", sessionId, geminiReady, elevenlabsReady }
  { type: "call_state", state: "listening"|"processing"|"ai_speaking"|"ended" }
  { type: "llm_response", text, time }
  { type: "stt_transcript", text, time }
  { type: "audio_response", audio: "<base64 mp3>", contentType: "audio/mpeg" }
  { type: "booking_confirmed", booking: {...} }
  { type: "cancellation_confirmed", cancellation: {...} }
  { type: "speech_error", error }
  { type: "speech_warning", message }
  { type: "error", code, message }
"""

import asyncio
import base64
import json
import logging
import time
from datetime import datetime
from typing import Dict, Any, List, Optional

from fastapi import WebSocket, WebSocketDisconnect

from backend.config import is_gemini_configured, is_elevenlabs_configured
from backend.services.gemini_service import gemini_service
from backend.services.elevenlabs_service import elevenlabs_service
from backend.database import SessionLocal, CallRecordModel

logger = logging.getLogger("medivoice.pipeline")


class PipecatVoiceSession:
    """
    Manages one real-time voice pipeline session:
      Browser Microphone
        → WebSocket binary audio chunks (base64 webm/opus)
        → ElevenLabs Scribe STT  (when speech_end received)
        → Gemini 2.5 Flash LLM  (with function-calling for booking/cancel)
        → ElevenLabs TTS         (MP3 bytes back to browser as base64)
        → Browser Audio()
    """

    def __init__(self, websocket: WebSocket, session_id: str):
        self.websocket = websocket
        self.session_id = session_id
        self.caller_phone = ""
        self.caller_name = "Caller"
        self.start_time = time.time()
        self.conversation_history: List[Dict[str, str]] = []
        self.transcript_turns: List[Dict[str, Any]] = []
        self.audio_buffer = bytearray()
        self.is_active = True
        self.last_booking: Optional[Dict] = None
        self.last_cancellation: Optional[Dict] = None
        self.call_state = "connecting"

    # ── Helpers ────────────────────────────────────────────────────────────────

    async def send(self, data: Dict[str, Any]) -> None:
        """Send a JSON message to the browser."""
        if not self.is_active:
            return
        try:
            await self.websocket.send_text(json.dumps(data))
        except Exception as exc:
            logger.debug(f"[{self.session_id}] send error: {exc}")

    async def set_state(self, state: str) -> None:
        self.call_state = state
        await self.send({
            "type": "call_state",
            "state": state,
            "timestamp": datetime.now().strftime("%H:%M:%S"),
        })

    def _add_turn(self, role: str, text: str) -> None:
        """Add a turn to both the visible transcript and the Gemini history."""
        time_str = datetime.now().strftime("%H:%M:%S")
        self.transcript_turns.append({"speaker": role, "text": text, "time": time_str})
        gemini_role = "assistant" if role == "assistant" else "user"
        self.conversation_history.append({"role": gemini_role, "content": text})

    # ── Greeting ───────────────────────────────────────────────────────────────

    async def greet(self) -> None:
        greeting = (
            "Good day! Thank you for calling Metropolitan Health Clinic. "
            "My name is Alex, your AI medical receptionist. "
            "How may I assist you with your appointment today?"
        )
        self._add_turn("assistant", greeting)
        await self.send({
            "type": "llm_response",
            "text": greeting,
            "time": datetime.now().strftime("%H:%M:%S"),
        })
        await self._speak(greeting)
        await self.set_state("listening")

    # ── TTS helper ─────────────────────────────────────────────────────────────

    async def _speak(self, text: str) -> None:
        """Convert text to speech and send audio to browser. Non-fatal."""
        if not text.strip():
            return
        if not is_elevenlabs_configured():
            await self.send({
                "type": "speech_warning",
                "message": "ElevenLabs TTS is not configured — add ELEVENLABS_API_KEY to backend/.env for voice audio.",
            })
            return
        await self.set_state("ai_speaking")
        try:
            tts = elevenlabs_service.text_to_speech(text)
            if tts.get("success") and tts.get("audio_bytes"):
                audio_b64 = base64.b64encode(tts["audio_bytes"]).decode()
                await self.send({
                    "type": "audio_response",
                    "audio": audio_b64,
                    "contentType": tts.get("content_type", "audio/mpeg"),
                })
            else:
                await self.send({
                    "type": "speech_error",
                    "error": tts.get("error", "ElevenLabs TTS synthesis failed."),
                })
        except Exception as exc:
            logger.error(f"[{self.session_id}] TTS error: {exc}")
            await self.send({"type": "speech_error", "error": str(exc)})

    # ── STT + LLM turn ─────────────────────────────────────────────────────────

    async def handle_audio_chunk(self, raw_bytes: bytes) -> None:
        """Accumulate raw audio bytes from the browser."""
        self.audio_buffer.extend(raw_bytes)

    async def handle_speech_end(self) -> None:
        """Process buffered audio through ElevenLabs STT, then Gemini, then TTS."""
        buffer_size = len(self.audio_buffer)
        if buffer_size < 800:
            logger.debug(f"[{self.session_id}] Audio buffer too small ({buffer_size} bytes), skipping STT")
            self.audio_buffer.clear()
            return

        audio_bytes = bytes(self.audio_buffer)
        self.audio_buffer.clear()
        await self.set_state("processing")

        # ── STT ──
        if not is_elevenlabs_configured():
            await self.send({
                "type": "error",
                "code": "ELEVENLABS_KEY_MISSING",
                "message": (
                    "ElevenLabs STT requires ELEVENLABS_API_KEY in backend/.env. "
                    "You can still use the text input box below while audio STT is unavailable."
                ),
            })
            await self.set_state("listening")
            return

        logger.info(f"[{self.session_id}] Sending {len(audio_bytes)} bytes to ElevenLabs STT")
        try:
            stt = elevenlabs_service.speech_to_text(audio_bytes, filename="caller.webm")
        except Exception as exc:
            logger.error(f"[{self.session_id}] STT call error: {exc}")
            await self.send({"type": "speech_warning", "message": "Could not reach speech recognition service. Please try again."})
            await self.set_state("listening")
            return

        recognized_text = (stt.get("text") or "").strip()
        if not stt.get("success") or not recognized_text:
            err = stt.get("error", "No speech detected")
            logger.info(f"[{self.session_id}] STT result: success={stt.get('success')}, text='{recognized_text}', err={err}")
            await self.send({"type": "speech_warning", "message": "Speech not recognized — please speak clearly and try again."})
            await self.set_state("listening")
            return

        logger.info(f"[{self.session_id}] STT recognized: '{recognized_text}'")
        await self.process_utterance(recognized_text)

    async def process_utterance(self, text: str) -> None:
        """Run one conversational turn: user text → Gemini → TTS."""
        if not text.strip():
            return

        self._add_turn("user", text)
        await self.send({
            "type": "stt_transcript",
            "text": text,
            "time": datetime.now().strftime("%H:%M:%S"),
        })
        await self.set_state("processing")

        # ── Gemini LLM ──
        if not is_gemini_configured():
            fallback = (
                "Gemini conversational intelligence is not yet configured. "
                "Please add your GEMINI_API_KEY to backend/.env to enable AI responses. "
                "In the meantime, you can manually book via the dashboard."
            )
            self._add_turn("assistant", fallback)
            await self.send({
                "type": "llm_response",
                "text": fallback,
                "time": datetime.now().strftime("%H:%M:%S"),
            })
            await self._speak(fallback)
            await self.set_state("listening")
            return

        try:
            gemini_res = gemini_service.chat(self.conversation_history)
        except Exception as exc:
            logger.error(f"[{self.session_id}] Gemini call error: {exc}")
            await self.send({"type": "speech_error", "error": f"Gemini error: {exc}"})
            await self.set_state("listening")
            return

        if gemini_res.get("error"):
            logger.error(f"[{self.session_id}] Gemini returned error: {gemini_res['error']}")
            await self.send({"type": "speech_error", "error": f"AI processing error: {gemini_res['error']}"})
            await self.set_state("listening")
            return

        ai_reply = gemini_res.get("response", "I am here to assist. How can I help?")

        # Booking notification
        if gemini_res.get("booking"):
            self.last_booking = gemini_res["booking"]
            await self.send({"type": "booking_confirmed", "booking": gemini_res["booking"]})

        # Cancellation notification
        if gemini_res.get("cancellation"):
            self.last_cancellation = gemini_res["cancellation"]
            await self.send({"type": "cancellation_confirmed", "cancellation": gemini_res["cancellation"]})

        self._add_turn("assistant", ai_reply)
        await self.send({
            "type": "llm_response",
            "text": ai_reply,
            "time": datetime.now().strftime("%H:%M:%S"),
        })

        # ── TTS ──
        await self._speak(ai_reply)
        await self.set_state("listening")

    # ── Session teardown ───────────────────────────────────────────────────────

    async def finish_and_save(self) -> None:
        self.is_active = False
        duration = max(5, int(time.time() - self.start_time))
        outcome = "inquiry_answered"
        doc_id = doc_name = doc_spec = apt_id = ""

        if self.last_booking:
            outcome = "appointment_booked"
            doc_id = self.last_booking.get("doctorId", "")
            doc_name = self.last_booking.get("doctorName", "")
            doc_spec = self.last_booking.get("doctorSpecialization", "")
            apt_id = self.last_booking.get("bookingId", "")
        elif self.last_cancellation:
            outcome = "appointment_cancelled"
            doc_name = self.last_cancellation.get("doctorName", "")
            doc_spec = self.last_cancellation.get("doctorSpecialization", "")
            apt_id = self.last_cancellation.get("bookingId", "")

        call_id = f"call-{int(time.time()) % 100000:05d}"
        summary = f"Call {duration}s. Outcome: {outcome.replace('_', ' ').title()}."

        db = SessionLocal()
        try:
            record = CallRecordModel(
                id=call_id,
                caller_phone=self.caller_phone or "+1 (555) 000-0000",
                caller_name=self.caller_name or "Verified Caller",
                timestamp="Just now",
                duration_seconds=duration,
                outcome=outcome,
                doctor_id=doc_id,
                doctor_name=doc_name,
                doctor_specialization=doc_spec,
                appointment_id=apt_id,
                summary=summary,
                sentiment="positive",
                transcript=json.dumps(self.transcript_turns),
            )
            db.add(record)
            db.commit()
            logger.info(f"[{self.session_id}] Saved call record {call_id}")
        except Exception as exc:
            logger.error(f"[{self.session_id}] Failed to save call record: {exc}")
            db.rollback()
        finally:
            db.close()


# ── WebSocket handler ─────────────────────────────────────────────────────────

async def handle_pipecat_websocket(websocket: WebSocket) -> None:
    """
    Entry point for /ws/call.
    Accepts the WebSocket, creates a session, processes the full call lifecycle.
    """
    await websocket.accept()
    session_id = f"mv-{int(time.time())}"
    session = PipecatVoiceSession(websocket, session_id)
    logger.info(f"Voice session started: {session_id}")

    try:
        # ── Handshake: tell browser the backend is ready ──
        await session.send({
            "type": "connection_ready",
            "sessionId": session_id,
            "version": "MediVoice Pipecat v1.17.0",
            "geminiReady": is_gemini_configured(),
            "elevenlabsReady": is_elevenlabs_configured(),
        })

        # ── Main message loop ──
        while True:
            try:
                msg = await asyncio.wait_for(websocket.receive(), timeout=120.0)
            except asyncio.TimeoutError:
                logger.info(f"[{session_id}] Session idle timeout — closing")
                break

            # Binary audio chunk (browser can send raw bytes)
            if msg.get("bytes"):
                await session.handle_audio_chunk(msg["bytes"])
                continue

            # JSON control messages
            raw_text = msg.get("text", "")
            if not raw_text:
                continue

            try:
                payload = json.loads(raw_text)
            except json.JSONDecodeError:
                logger.warning(f"[{session_id}] Invalid JSON received")
                continue

            msg_type = payload.get("type", "")

            if msg_type == "init":
                # Browser sent caller identity — greet the caller
                session.caller_phone = payload.get("callerPhone", "")
                session.caller_name = payload.get("callerName", "Caller")
                await session.greet()

            elif msg_type == "audio_chunk":
                # Base64-encoded audio blob from MediaRecorder
                b64 = payload.get("data", "")
                if b64:
                    try:
                        raw = base64.b64decode(b64)
                        await session.handle_audio_chunk(raw)
                    except Exception as exc:
                        logger.warning(f"[{session_id}] audio_chunk decode error: {exc}")

            elif msg_type == "speech_end":
                # User stopped speaking — run STT + Gemini + TTS
                await session.handle_speech_end()

            elif msg_type == "text_input":
                # Typed text from the input box — goes directly to Gemini
                user_text = payload.get("text", "").strip()
                if user_text:
                    await session.process_utterance(user_text)

            elif msg_type == "interrupt":
                # User started speaking while AI was talking — reset to listening
                await session.set_state("listening")

            elif msg_type == "ping":
                await session.send({"type": "pong"})

            elif msg_type == "end_call":
                logger.info(f"[{session_id}] End-call requested by browser")
                await session.send({"type": "call_state", "state": "ended"})
                break

            else:
                logger.debug(f"[{session_id}] Unknown message type: {msg_type}")

    except WebSocketDisconnect:
        logger.info(f"[{session_id}] Browser disconnected")
    except RuntimeError as exc:
        if "disconnect message has been received" in str(exc):
            logger.info(f"[{session_id}] Browser disconnected (channel closed)")
        else:
            logger.error(f"[{session_id}] Pipeline runtime error: {exc}", exc_info=True)
    except Exception as exc:
        logger.error(f"[{session_id}] Pipeline error: {exc}", exc_info=True)
        try:
            await session.send({"type": "error", "code": "PIPELINE_ERROR", "message": str(exc)})
        except Exception:
            pass
    finally:
        await session.finish_and_save()
        logger.info(f"[{session_id}] Session closed")
