import pytest
from backend.database import init_db, SessionLocal, DoctorModel, AppointmentModel
from backend.services.appointment_service import (
    check_doctor_availability,
    book_appointment,
    cancel_appointment
)

def test_database_and_booking_flow():
    # 1. Initialize Database
    init_db()
    db = SessionLocal()
    
    # 2. Check initial doctors exist
    doctors = db.query(DoctorModel).all()
    assert len(doctors) >= 5, f"Expected at least 5 doctors, got {len(doctors)}"
    
    # 3. Check availability for Cardiology
    avail = check_doctor_availability("Cardiology", db=db)
    assert avail["success"] is True
    assert avail["count"] >= 1
    doc_sarah = next((d for d in avail["doctors"] if "Sarah" in d["doctorName"]), None)
    assert doc_sarah is not None
    assert len(doc_sarah["availableSlotsToday"]) > 0
    slot_to_book = doc_sarah["availableSlotsToday"][0]
    initial_slots_count = len(doc_sarah["availableSlotsToday"])
    
    # 4. Book appointment
    booking_res = book_appointment(
        patient_name="Unit Test Patient",
        patient_phone="555-123-4567",
        doctor_id=doc_sarah["doctorId"],
        slot=slot_to_book,
        symptoms="Test cardiac checkup",
        db=db
    )
    assert booking_res["success"] is True, f"Booking failed: {booking_res.get('error')}"
    booking_data = booking_res["booking"]
    booking_id = booking_data["bookingId"]
    assert booking_id.startswith("MED-2026-")
    
    # 5. Verify slot was removed from doctor's available slots
    avail_after = check_doctor_availability("Cardiology", db=db)
    doc_after = next((d for d in avail_after["doctors"] if d["doctorId"] == doc_sarah["doctorId"]), None)
    assert slot_to_book not in doc_after["availableSlotsToday"]
    assert len(doc_after["availableSlotsToday"]) == initial_slots_count - 1
    
    # 6. Verify duplicate booking prevention
    dup_res = book_appointment(
        patient_name="Unit Test Patient",
        patient_phone="555-123-4567",
        doctor_id=doc_sarah["doctorId"],
        slot=doc_after["availableSlotsToday"][0] if doc_after["availableSlotsToday"] else "11:30 AM",
        db=db
    )
    assert dup_res["success"] is False
    assert "already exists" in dup_res["error"]
    
    # 7. Cancel appointment
    cancel_res = cancel_appointment(
        booking_id=booking_id,
        phone="555-123-4567",
        reason="Patient rescheduled meeting",
        db=db
    )
    assert cancel_res["success"] is True, f"Cancellation failed: {cancel_res.get('error')}"
    
    # 8. Verify slot is restored
    avail_restored = check_doctor_availability("Cardiology", db=db)
    doc_restored = next((d for d in avail_restored["doctors"] if d["doctorId"] == doc_sarah["doctorId"]), None)
    assert slot_to_book in doc_restored["availableSlotsToday"]
    
    db.close()
    print("PHASE 2 DATABASE & BOOKING FLOW TEST: ALL PASSED!")

if __name__ == "__main__":
    test_database_and_booking_flow()
