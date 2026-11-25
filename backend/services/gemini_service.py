import json
import logging
from typing import Dict, Any, List, Optional
from backend.config import GEMINI_API_KEY, is_gemini_configured
from backend.services.appointment_service import (
    check_doctor_availability as appt_check_availability,
    book_appointment as appt_book,
    cancel_appointment as appt_cancel
)

logger = logging.getLogger("medivoice.gemini")

# ── Clean Tool Wrappers with Primitive Schema for Gemini Function Calling ──

def check_doctor_availability(
    doctor_name_or_specialization: Optional[str] = None,
    doctor_name: Optional[str] = None,
    specialization: Optional[str] = None
) -> dict:
    """Checks doctor roster and returns available doctors and their open consultation slots today."""
    return appt_check_availability(
        doctor_name_or_specialization=doctor_name_or_specialization,
        doctor_name=doctor_name,
        specialization=specialization
    )

def book_appointment(
    patient_name: str,
    patient_phone: str,
    doctor_id: str,
    slot: str,
    symptoms: Optional[str] = "Consultation scheduled via MediVoice AI Assistant"
) -> dict:
    """Rechecks slot availability, validates phone, and confirms the appointment in the database."""
    return appt_book(
        patient_name=patient_name,
        patient_phone=patient_phone,
        doctor_id=doctor_id,
        slot=slot,
        symptoms=symptoms
    )

def cancel_appointment(
    booking_id: Optional[str] = None,
    phone: Optional[str] = None,
    reason: Optional[str] = "Patient verbal cancellation via MediVoice AI Assistant"
) -> dict:
    """Finds patient active appointment by bookingId or phone, cancels it, and restores doctor slot."""
    return appt_cancel(
        booking_id=booking_id,
        phone=phone,
        reason=reason
    )

SYSTEM_INSTRUCTION = """You are the AI Medical Receptionist for Metropolitan Health Clinic (MediVoice AI).
Your demeanor is warm, professional, empathetic, and clear.

CLINICAL BOOKING PROTOCOL:
1. Greet the patient warmly and understand their inquiry.
2. When the caller asks to see a doctor or mentions a symptom/specialty, immediately check doctor availability using the `check_doctor_availability` tool.
3. Present available doctors and their open time slots clearly.
4. Ask for the patient's full name and phone number.
5. CRITICAL: Once the patient gives their phone number, YOU MUST REPEAT the phone number back to them and ask for explicit confirmation (e.g. "I have your phone number as 555-234-5678. Is that correct?").
6. ONLY AFTER the caller explicitly confirms the phone number and appointment details, call `book_appointment`.
7. NEVER claim an appointment is booked or confirmed until `book_appointment` returns success: true with the booking ID. If the tool returns an error (e.g., slot already taken), inform the patient politely and offer another slot.
8. Once confirmed, state the booking ID and room number clearly.

CANCELLATION PROTOCOL:
1. If the caller wants to cancel, request their phone number (and booking reference if known).
2. Repeat their phone number back and ask for confirmation.
3. Call `cancel_appointment`. If multiple appointments exist, ask which doctor or time they wish to cancel.
4. Obtain explicit verbal confirmation before finalizing cancellation.
5. Never claim an appointment is cancelled unless `cancel_appointment` confirms it.

Keep your verbal responses conversational, natural, and concise (1-3 sentences) suitable for speech.
"""

class GeminiService:
    def __init__(self):
        self.client = None
        self._init_client()

    def _init_client(self):
        if is_gemini_configured():
            try:
                from google import genai
                self.client = genai.Client(api_key=GEMINI_API_KEY)
                logger.info("Initialized Google GenAI client (google-genai SDK).")
            except Exception as e:
                logger.error(f"Failed to initialize google.genai client: {e}")
                self.client = None
        else:
            self.client = None

    def is_ready(self) -> bool:
        return self.client is not None and is_gemini_configured()

    def chat(self, messages: List[Dict[str, str]], latest_event_callback=None) -> Dict[str, Any]:
        """
        Processes conversation turns with tool-calling capabilities.
        Returns {'response': text, 'booking': optional_data, 'cancellation': optional_data, 'error': optional_error}
        """
        if not self.is_ready():
            return {
                "response": "MediVoice conversational intelligence is currently waiting for a valid Gemini API key. Please configure GEMINI_API_KEY in the backend .env file.",
                "error": "GEMINI_API_KEY_MISSING",
                "booking": None,
                "cancellation": None
            }

        booking_result = None
        cancellation_result = None

        # Tool definitions
        tools = [
            check_doctor_availability,
            book_appointment,
            cancel_appointment
        ]

        try:
            # Check if using official google-genai
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=GEMINI_API_KEY)

            # Build history (normalize roles: must start with user and alternate)
            contents = []
            for m in messages:
                text = (m.get("content") or "").strip()
                if not text:
                    continue
                role = "user" if m.get("role") in ["user", "caller"] else "model"
                if not contents and role == "model":
                    contents.append(types.Content(
                        role="user",
                        parts=[types.Part.from_text(text="Hello, I am calling Metropolitan Health Clinic.")]
                    ))
                if contents and contents[-1].role == role:
                    # Merge consecutive same-role turns
                    prev_text = contents[-1].parts[0].text or ""
                    contents[-1] = types.Content(
                        role=role,
                        parts=[types.Part.from_text(text=f"{prev_text}\n{text}")]
                    )
                else:
                    contents.append(types.Content(
                        role=role,
                        parts=[types.Part.from_text(text=text)]
                    ))

            config = types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                tools=tools,
                temperature=0.3,
            )

            # Iterative tool calling loop
            for _ in range(5):
                response = None
                for candidate_model in ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash']:
                    try:
                        response = client.models.generate_content(
                            model=candidate_model,
                            contents=contents,
                            config=config
                        )
                        if response:
                            break
                    except Exception as model_err:
                        logger.warning(f"Model {candidate_model} failed, trying alternative: {model_err}")
                
                if not response:
                    raise RuntimeError("All Gemini candidate models failed to generate content.")

                candidate = response.candidates[0]
                has_function_calls = False
                tool_parts = []

                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        if hasattr(part, 'function_call') and part.function_call:
                            has_function_calls = True
                            fn_call = part.function_call
                            fn_name = fn_call.name
                            fn_args = dict(fn_call.args) if fn_call.args else {}
                            logger.info(f"Gemini calling tool: {fn_name} with args: {fn_args}")

                            # Execute tool
                            if fn_name == "check_doctor_availability":
                                fn_res = check_doctor_availability(**fn_args)
                            elif fn_name == "book_appointment":
                                fn_res = book_appointment(**fn_args)
                                if fn_res.get("success") and fn_res.get("booking"):
                                    booking_result = fn_res.get("booking")
                            elif fn_name == "cancel_appointment":
                                fn_res = cancel_appointment(**fn_args)
                                if fn_res.get("success") and fn_res.get("cancellation"):
                                    cancellation_result = fn_res.get("cancellation")
                            else:
                                fn_res = {"error": f"Unknown tool: {fn_name}"}

                            tool_parts.append(types.Part.from_function_response(
                                name=fn_name,
                                response={"result": fn_res}
                            ))

                if has_function_calls:
                    # Append model call and tool response to conversation and re-call
                    contents.append(candidate.content)
                    contents.append(types.Content(role="user", parts=tool_parts))
                else:
                    reply_text = response.text if hasattr(response, 'text') and response.text else "I am here to assist with your medical appointments. How can I help?"
                    return {
                        "response": reply_text.strip(),
                        "booking": booking_result,
                        "cancellation": cancellation_result,
                        "error": None
                    }

            return {
                "response": "I have processed your request.",
                "booking": booking_result,
                "cancellation": cancellation_result,
                "error": None
            }

        except Exception as e:
            logger.error(f"Gemini API processing error: {e}", exc_info=True)
            return {
                "response": "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment.",
                "error": str(e),
                "booking": booking_result,
                "cancellation": cancellation_result,
            }

gemini_service = GeminiService()
