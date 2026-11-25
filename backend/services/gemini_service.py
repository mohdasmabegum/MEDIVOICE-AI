import json
import logging
from typing import Dict, Any, List, Optional
from backend.config import GEMINI_API_KEY, is_gemini_configured
from backend.services.appointment_service import (
    check_doctor_availability as appt_check_availability,
    book_appointment as appt_book,
    cancel_appointment as appt_cancel,
    normalize_phone,
    format_phone_display,
)

logger = logging.getLogger("medivoice.gemini")

# ── Clean Tool Wrappers with Primitive Schema for Gemini Function Calling ──

def confirm_caller_phone(phone_number: str) -> dict:
    """Stores the caller's verbally confirmed phone number in the active conversation session."""
    digits = normalize_phone(phone_number)
    if len(digits) < 7 or len(digits) > 15:
        return {
            "success": False,
            "error": "Please provide a valid 7 to 10 digit telephone number."
        }
    formatted = format_phone_display(phone_number)
    return {
        "success": True,
        "confirmed_phone": formatted,
        "digits": digits,
        "message": f"Phone number {formatted} is now confirmed and saved for this session."
    }

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
    date: Optional[str] = None,
    symptoms: Optional[str] = "Consultation scheduled via MediVoice AI Assistant"
) -> dict:
    """Rechecks slot availability, validates phone, and confirms the appointment in the database."""
    return appt_book(
        patient_name=patient_name,
        patient_phone=patient_phone,
        doctor_id=doctor_id,
        slot=slot,
        date=date,
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

SYSTEM_INSTRUCTION = """You are Alex, the AI Medical Receptionist for Metropolitan Health Clinic (MediVoice AI).
Your demeanor is warm, professional, empathetic, and concise (1-3 natural sentences suitable for voice).

CALLER IDENTIFICATION SEQUENCE (MANDATORY):
1. Ask the caller for their phone number if it has not yet been confirmed in this session.
2. When they state digits, normalize and repeat the complete phone number back clearly and ask them to confirm it (e.g., "I have your number as 555-732-9104. Is that correct?").
3. ONLY AFTER the caller confirms it is correct, call `confirm_caller_phone` to store it in the active session.
4. Use that confirmed session phone number for subsequent booking and cancellation operations.

CLINICAL BOOKING PROTOCOL:
1. When the caller asks about a doctor or mentions a symptom/specialty, immediately call `check_doctor_availability` and present real available doctors, rooms, and slots (never invent unavailable slots; suggest alternatives if none are open).
2. Collect the caller's full name, confirmed phone number, doctor, preferred date (default Today), and preferred time slot.
3. Repeat the booking details back and obtain explicit confirmation before calling `book_appointment`.
4. NEVER claim an appointment is booked until `book_appointment` returns success: true with a booking ID. State the booking ID and room number clearly.

CANCELLATION PROTOCOL:
1. Locate active appointments using the caller's confirmed phone number (or booking ID) via `cancel_appointment` — wait: ALWAYS read the appointment details back and obtain explicit verbal confirmation BEFORE finalizing cancellation.
2. If multiple active appointments exist for that phone number, list them and ask which one to cancel.
3. Never claim an appointment is cancelled unless `cancel_appointment` returns success: true.
"""

class GeminiService:
    DEFAULT_MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash']

    def __init__(self):
        self.client = None
        self._preferred_model: Optional[str] = None
        self._init_client()

    def _init_client(self):
        if is_gemini_configured():
            try:
                from google import genai
                from google.genai import types
                self.client = genai.Client(
                    api_key=GEMINI_API_KEY,
                    http_options=types.HttpOptions(
                        timeout=20000,
                        retry_options=types.HttpRetryOptions(attempts=1),
                    ),
                )
                logger.info("Initialized Google GenAI client (google-genai SDK).")
            except Exception as e:
                logger.error(f"Failed to initialize google.genai client: {e}")
                self.client = None
        else:
            self.client = None

    def is_ready(self) -> bool:
        return self.client is not None and is_gemini_configured()

    def chat(
        self,
        messages: List[Dict[str, str]],
        latest_event_callback=None,
        session_state: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Processes conversation turns with tool-calling capabilities.
        Returns {'response': text, 'booking': optional_data, 'cancellation': optional_data, 'confirmed_phone': optional_str, 'error': optional_error}
        """
        if not self.is_ready():
            return {
                "response": "MediVoice conversational intelligence is currently waiting for a valid Gemini API key. Please configure GEMINI_API_KEY in the backend .env file.",
                "error": "GEMINI_API_KEY_MISSING",
                "booking": None,
                "cancellation": None,
                "confirmed_phone": None,
            }

        booking_result = None
        cancellation_result = None
        confirmed_phone = (session_state or {}).get("confirmed_phone", "")

        # Tool definitions
        tools = [
            confirm_caller_phone,
            check_doctor_availability,
            book_appointment,
            cancel_appointment
        ]

        try:
            # Check if using official google-genai
            from google import genai
            from google.genai import types

            client = self.client or genai.Client(
                api_key=GEMINI_API_KEY,
                http_options=types.HttpOptions(
                    timeout=20000,
                    retry_options=types.HttpRetryOptions(attempts=1),
                ),
            )

            # Build history (keep recent 14 turns for fast inference; normalize roles)
            recent_messages = messages[-14:] if len(messages) > 14 else messages
            contents = []
            for m in recent_messages:
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

            active_instruction = SYSTEM_INSTRUCTION
            if confirmed_phone:
                active_instruction += f"\n\nACTIVE SESSION CONTEXT: Caller's confirmed phone number is {confirmed_phone}. Use this number for bookings and cancellations without asking again."

            config = types.GenerateContentConfig(
                system_instruction=active_instruction,
                tools=tools,
                temperature=0.3,
                max_output_tokens=220,
                automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
            )

            # Iterative tool calling loop
            model_order = list(self.DEFAULT_MODELS)
            if self._preferred_model and self._preferred_model in model_order:
                model_order.remove(self._preferred_model)
                model_order.insert(0, self._preferred_model)

            for _ in range(5):
                response = None
                last_model_err = None
                for candidate_model in model_order:
                    try:
                        response = client.models.generate_content(
                            model=candidate_model,
                            contents=contents,
                            config=config
                        )
                        if response:
                            self._preferred_model = candidate_model
                            if model_order[0] != candidate_model:
                                model_order.remove(candidate_model)
                                model_order.insert(0, candidate_model)
                            break
                    except Exception as model_err:
                        last_model_err = model_err
                        logger.warning(f"Model {candidate_model} failed, trying alternative: {model_err}")
                
                if not response:
                    raise RuntimeError(f"All Gemini candidate models failed: {last_model_err}")

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
                            if fn_name == "confirm_caller_phone":
                                fn_res = confirm_caller_phone(**fn_args)
                                if fn_res.get("success") and fn_res.get("confirmed_phone"):
                                    confirmed_phone = fn_res["confirmed_phone"]
                                    if session_state is not None:
                                        session_state["confirmed_phone"] = confirmed_phone
                            elif fn_name == "check_doctor_availability":
                                fn_res = check_doctor_availability(**fn_args)
                            elif fn_name == "book_appointment":
                                if not fn_args.get("patient_phone") and confirmed_phone:
                                    fn_args["patient_phone"] = confirmed_phone
                                fn_res = book_appointment(**fn_args)
                                if fn_res.get("success") and fn_res.get("booking"):
                                    booking_result = fn_res.get("booking")
                            elif fn_name == "cancel_appointment":
                                if not fn_args.get("phone") and not fn_args.get("booking_id") and confirmed_phone:
                                    fn_args["phone"] = confirmed_phone
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
