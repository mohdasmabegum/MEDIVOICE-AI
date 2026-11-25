import json
import random
import re
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.database import SessionLocal, DoctorModel, AppointmentModel, CallRecordModel

def normalize_phone(phone: str) -> str:
    return re.sub(r'\D', '', phone)


def format_phone_display(phone: str) -> str:
    digits = normalize_phone(phone)
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    if len(digits) == 11 and digits.startswith("1"):
        return f"+1 ({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
    return phone.strip()


def _slot_sort_key(slot: str):
    try:
        return datetime.strptime(slot.strip().upper(), "%I:%M %p")
    except ValueError:
        return datetime.max

def check_doctor_availability(
    doctor_name_or_specialization: Optional[str] = None,
    doctor_name: Optional[str] = None,
    specialization: Optional[str] = None,
    date: Optional[str] = None,
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Checks doctor roster and returns available doctors and their open consultation slots today.
    Understands doctor specializations, retrieves matching doctors, and suggests alternatives when unavailable.
    """
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        query = db.query(DoctorModel)
        search_query = doctor_name_or_specialization or doctor_name or specialization
        
        if search_query and isinstance(search_query, str):
            term = search_query.lower().strip()
            clean_term = term.replace("dr.", "").replace("dr ", "").replace("doctor", "").strip()
            
            doctors = query.all()
            matched = []
            for doc in doctors:
                name_clean = doc.name.lower().replace("dr.", "").replace("dr ", "").strip()
                spec_clean = doc.specialization.lower().strip()
                dept_clean = doc.department.lower().strip()
                if (clean_term in name_clean or clean_term in spec_clean or clean_term in dept_clean or
                    term in doc.name.lower() or term in spec_clean):
                    matched.append(doc)
            
            alternatives = []
            if not matched:
                # If specific search had no match, provide all available doctors as suggestions
                matched = [d for d in doctors if d.status == 'available' and len(json.loads(d.slots_today or "[]")) > 0]
                alternatives = matched
        else:
            doctors = query.all()
            matched = [d for d in doctors if d.status == 'available' and len(json.loads(d.slots_today or "[]")) > 0]
            alternatives = []

        results = []
        for doc in matched:
            slots = json.loads(doc.slots_today or "[]")
            results.append({
                "doctorId": doc.id,
                "doctorName": doc.name,
                "specialization": doc.specialization,
                "department": doc.department,
                "roomNumber": doc.room_number,
                "status": doc.status,
                "availableSlotsToday": slots,
                "nextAvailableSlot": doc.next_available_slot,
            })

        msg = f"Found {len(results)} physician(s) matching your request." if results else "No physicians currently matching that criteria."
        if not results:
            all_avail = [d for d in query.all() if d.status == 'available' and len(json.loads(d.slots_today or "[]")) > 0]
            if all_avail:
                msg += f" Alternative available physicians today: {', '.join(d.name + ' (' + d.specialization + ')' for d in all_avail)}."

        return {
            "success": True,
            "count": len(results),
            "doctors": results,
            "message": msg
        }
    finally:
        if close_db:
            db.close()

def book_appointment(
    patient_name: str = "Verified Caller",
    patient_phone: str = "",
    doctor_id: Optional[str] = None,
    doctor_name: Optional[str] = None,
    slot: Optional[str] = None,
    time: Optional[str] = None,
    time_slot: Optional[str] = None,
    appointment_time: Optional[str] = None,
    appointment_date: Optional[str] = None,
    date: Optional[str] = None,
    symptoms: Optional[str] = "Consultation scheduled via MediVoice AI Assistant",
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Rechecks slot availability, validates phone, saves to DB, removes slot from doctor's today slots.
    Never claims booked unless database transaction succeeds.
    """
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        # Resolve parameters
        doc_identifier = doctor_id or doctor_name or ""
        chosen_slot = slot or time or time_slot or appointment_time or ""

        # 1. Phone number validation
        digits_only = normalize_phone(patient_phone)
        if len(digits_only) < 7:
            return {
                "success": False,
                "error": "Invalid phone number format. Please provide a valid 7 to 10 digit telephone number."
            }

        if not doc_identifier:
            return {
                "success": False,
                "error": "Please specify which physician or specialization you wish to consult."
            }

        if not chosen_slot:
            return {
                "success": False,
                "error": "Please specify an available time slot for the consultation."
            }

        # 2. Locate doctor
        doc = db.query(DoctorModel).filter(DoctorModel.id == doc_identifier).first()
        if not doc:
            # Fallback attempt by doctor name or clean name
            doc = db.query(DoctorModel).filter(DoctorModel.name.ilike(f"%{doc_identifier}%")).first()
        if not doc:
            clean_name = doc_identifier.lower().replace("dr.", "").replace("dr ", "").strip()
            doc = db.query(DoctorModel).filter(DoctorModel.name.ilike(f"%{clean_name}%")).first()
        
        if not doc:
            return {
                "success": False,
                "error": f"Doctor '{doc_identifier}' is not in the active clinic roster."
            }

        # 3. Recheck slot availability
        current_slots: List[str] = json.loads(doc.slots_today or "[]")
        requested_slot_clean = chosen_slot.strip().lower()
        
        matched_slot = None
        for s in current_slots:
            if requested_slot_clean in s.lower() or s.lower() in requested_slot_clean:
                matched_slot = s
                break

        if not matched_slot:
            return {
                "success": False,
                "error": f"The slot '{chosen_slot}' with {doc.name} is no longer available. Available slots: {', '.join(current_slots) if current_slots else 'None today'}."
            }

        # 4. Check for duplicate active appointment (same patient phone + doctor)
        existing = db.query(AppointmentModel).filter(
            AppointmentModel.doctor_id == doc.id,
            AppointmentModel.status != "cancelled"
        ).all()
        for apt in existing:
            if normalize_phone(apt.patient_phone) == digits_only:
                return {
                    "success": False,
                    "error": f"An active appointment already exists for phone {patient_phone} with {doc.name} at {apt.time_slot}."
                }

        # 5. Generate unique booking ID
        booking_id = f"MED-2026-{random.randint(1000, 9999)}"
        while db.query(AppointmentModel).filter(AppointmentModel.id == booking_id).first():
            booking_id = f"MED-2026-{random.randint(1000, 9999)}"

        today_date_str = (appointment_date or date or "").strip() or f"Today, {datetime.now().strftime('%b %d, %Y')}"
        booked_time_str = datetime.now().strftime("%I:%M %p")

        # 6. Create appointment record
        new_apt = AppointmentModel(
            id=booking_id,
            patient_name=patient_name or "Verified Caller",
            patient_phone=patient_phone,
            patient_email="",
            doctor_id=doc.id,
            doctor_name=doc.name,
            doctor_specialization=doc.specialization,
            doctor_avatar=doc.avatar,
            date_time=today_date_str,
            time_slot=matched_slot,
            duration_minutes=30,
            status="confirmed",
            booked_via="ai_voice",
            symptoms=symptoms or "Consultation scheduled via MediVoice AI Assistant",
            room_number=doc.room_number
        )
        db.add(new_apt)

        # 7. Update doctor's available slots & patient count
        current_slots.remove(matched_slot)
        doc.slots_today = json.dumps(current_slots)
        doc.total_patients += 1
        if len(current_slots) == 0:
            doc.status = "in_consultation"
            doc.next_available_slot = "Tomorrow, 09:00 AM"
        else:
            doc.next_available_slot = f"Today, {current_slots[0]}"
        
        db.commit()
        db.refresh(new_apt)
        db.refresh(doc)

        booking_payload = {
            "bookingId": new_apt.id,
            "patientName": new_apt.patient_name,
            "patientPhone": new_apt.patient_phone,
            "doctorId": doc.id,
            "doctorName": doc.name,
            "doctorSpecialization": doc.specialization,
            "doctorAvatar": doc.avatar,
            "appointmentDate": new_apt.date_time,
            "appointmentTime": new_apt.time_slot,
            "bookingStatus": "confirmed",
            "roomNumber": doc.room_number,
            "symptoms": new_apt.symptoms,
            "bookedAt": booked_time_str,
            "clinicName": "Metropolitan Health Clinic",
            "clinicAddress": "450 Health Sciences Blvd, Wing B",
        }

        return {
            "success": True,
            "booking": booking_payload,
            "message": f"Appointment successfully confirmed with {doc.name} for {matched_slot}."
        }
    except Exception as e:
        db.rollback()
        return {
            "success": False,
            "error": f"Database transaction failed during booking: {str(e)}"
        }
    finally:
        if close_db:
            db.close()

def cancel_appointment(
    booking_id: Optional[str] = None,
    phone: Optional[str] = None,
    patient_phone: Optional[str] = None,
    reason: Optional[str] = "Patient verbal cancellation via MediVoice AI Assistant",
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Finds patient's active appointment by bookingId or phone, cancels it in DB,
    and restores the cancelled slot to the doctor's today slots.
    """
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        apt = None
        target_phone = phone or patient_phone
        digits_only = normalize_phone(target_phone) if target_phone else ""

        if booking_id:
            apt = db.query(AppointmentModel).filter(
                AppointmentModel.id == booking_id.strip(),
                AppointmentModel.status != "cancelled"
            ).first()

        if not apt and digits_only:
            # Query all active appointments and match phone digits
            active_apts = db.query(AppointmentModel).filter(
                AppointmentModel.status != "cancelled"
            ).all()
            matched = [a for a in active_apts if normalize_phone(a.patient_phone) == digits_only]
            if len(matched) == 1:
                apt = matched[0]
            elif len(matched) > 1:
                # Multiple active appointments exist - return list so assistant can ask which one
                return {
                    "success": False,
                    "multiple": True,
                    "appointments": [a.to_dict() for a in matched],
                    "error": f"Found {len(matched)} active appointments for phone {phone}. Please specify the booking reference or doctor name."
                }

        if not apt:
            return {
                "success": False,
                "error": f"No active appointment found for phone '{phone}' or booking ID '{booking_id}'."
            }

        # Cancel the appointment
        apt.status = "cancelled"
        apt.cancellation_reason = reason or "Patient verbal cancellation via MediVoice AI Assistant"

        # Restore slot to doctor's today slots
        doc = db.query(DoctorModel).filter(DoctorModel.id == apt.doctor_id).first()
        restored_slot = apt.time_slot
        if doc:
            current_slots = json.loads(doc.slots_today or "[]")
            if restored_slot not in current_slots:
                current_slots.append(restored_slot)
                current_slots.sort(key=_slot_sort_key)
                doc.slots_today = json.dumps(current_slots)
            doc.status = "available"
            doc.next_available_slot = f"Today, {current_slots[0]}"

        db.commit()
        db.refresh(apt)
        if doc:
            db.refresh(doc)

        cancellation_payload = {
            "bookingId": apt.id,
            "patientPhone": apt.patient_phone,
            "doctorName": apt.doctor_name,
            "doctorSpecialization": apt.doctor_specialization,
            "appointmentDate": apt.date_time,
            "appointmentTime": apt.time_slot,
            "cancellationStatus": "cancelled",
            "cancelledAt": datetime.now().strftime("%I:%M %p"),
            "reason": apt.cancellation_reason,
        }

        return {
            "success": True,
            "cancellation": cancellation_payload,
            "message": f"Appointment {apt.id} with {apt.doctor_name} has been cancelled and the {apt.time_slot} slot is restored."
        }
    except Exception as e:
        db.rollback()
        return {
            "success": False,
            "error": f"Database transaction failed during cancellation: {str(e)}"
        }
    finally:
        if close_db:
            db.close()
