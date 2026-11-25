import pytest
from backend.database import init_db, SessionLocal, DoctorModel, AppointmentModel, CallRecordModel
from backend.main import (
    get_doctors,
    get_doctors_availability,
    get_appointments,
    get_appointment_by_id,
    api_book_appointment,
    api_cancel_appointment_by_id,
    api_cancel_appointment,
    get_call_records,
    get_admin_statistics,
    health_check,
    BookAppointmentRequest,
    CancelAppointmentRequest,
)
from fastapi import HTTPException

@pytest.fixture(scope="module")
def db_session():
    init_db()
    db = SessionLocal()
    yield db
    db.close()

def test_health_check(db_session):
    res = health_check(db=db_session)
    assert res["status"] == "healthy"
    assert res["database"]["status"] == "connected"
    assert res["database"]["doctorsCount"] >= 5

def test_get_admin_statistics(db_session):
    stats = get_admin_statistics(db=db_session)
    assert "totalDoctors" in stats
    assert "availableDoctors" in stats
    assert "todayAppointments" in stats
    assert "cancelledAppointments" in stats
    assert stats["totalDoctors"] >= 5

def test_get_doctors(db_session):
    doctors = get_doctors(db=db_session)
    assert len(doctors) >= 5
    first = doctors[0]
    assert "id" in first
    assert "name" in first
    assert "specialization" in first
    assert "slotsToday" in first

def test_get_doctors_with_filter(db_session):
    cardio_docs = get_doctors(specialization="Cardiology", db=db_session)
    assert len(cardio_docs) >= 1
    assert any("Cardiology" in d["specialization"] for d in cardio_docs)

def test_get_doctors_availability(db_session):
    avail = get_doctors_availability(specialization="Cardiology", db=db_session)
    assert avail["success"] is True
    assert avail["count"] >= 1
    assert len(avail["doctors"]) >= 1

def test_full_booking_and_cancellation_workflow(db_session):
    # 1. Check availability
    avail = get_doctors_availability(specialization="Cardiology", db=db_session)
    assert avail["count"] >= 1
    doc = avail["doctors"][0]
    assert len(doc["availableSlotsToday"]) > 0
    slot_to_book = doc["availableSlotsToday"][0]
    initial_slots_count = len(doc["availableSlotsToday"])

    # 2. Book appointment via POST /api/appointments
    req = BookAppointmentRequest(
        patientName="Jane Doe",
        patientPhone="555-444-3322",
        doctorId=doc["doctorId"],
        slot=slot_to_book,
        symptoms="Routine cardiac screening"
    )
    booking = api_book_appointment(req=req, db=db_session)
    assert booking["bookingId"].startswith("MED-2026-")
    assert booking["patientPhone"] == "555-444-3322"
    assert booking["appointmentTime"] == slot_to_book
    booking_id = booking["bookingId"]

    # 3. Retrieve appointment by ID via GET /api/appointments/{id}
    apt_retrieved = get_appointment_by_id(id=booking_id, db=db_session)
    assert apt_retrieved["id"] == booking_id
    assert apt_retrieved["patientName"] == "Jane Doe"
    assert apt_retrieved["status"] == "confirmed"

    # 4. Verify slot is removed from doctor
    avail_after = get_doctors_availability(specialization="Cardiology", db=db_session)
    doc_after = next(d for d in avail_after["doctors"] if d["doctorId"] == doc["doctorId"])
    assert slot_to_book not in doc_after["availableSlotsToday"]
    assert len(doc_after["availableSlotsToday"]) == initial_slots_count - 1

    # 5. Verify double-booking prevention on same slot
    with pytest.raises(HTTPException) as exc_info:
        api_book_appointment(
            req=BookAppointmentRequest(
                patientName="Another Patient",
                patientPhone="555-999-8877",
                doctorId=doc["doctorId"],
                slot=slot_to_book,
            ),
            db=db_session
        )
    assert exc_info.value.status_code == 400
    assert "no longer available" in exc_info.value.detail.lower()

    # 6. Verify duplicate patient phone prevention on same doctor
    if len(doc_after["availableSlotsToday"]) > 0:
        other_slot = doc_after["availableSlotsToday"][0]
        with pytest.raises(HTTPException) as exc_dup:
            api_book_appointment(
                req=BookAppointmentRequest(
                    patientName="Jane Doe",
                    patientPhone="555-444-3322",
                    doctorId=doc["doctorId"],
                    slot=other_slot,
                ),
                db=db_session
            )
        assert exc_dup.value.status_code == 400
        assert "already exists" in exc_dup.value.detail.lower()

    # 7. Cancel appointment via POST /api/appointments/{id}/cancel
    cancel_req = CancelAppointmentRequest(
        bookingId=booking_id,
        patientPhone="555-444-3322",
        reason="Patient schedule conflict"
    )
    cancellation = api_cancel_appointment_by_id(id=booking_id, req=cancel_req, db=db_session)
    assert cancellation["bookingId"] == booking_id
    assert cancellation["cancellationStatus"] == "cancelled"

    # 8. Verify appointment status is updated in database
    apt_cancelled = get_appointment_by_id(id=booking_id, db=db_session)
    assert apt_cancelled["status"] == "cancelled"

    # 9. Verify doctor slot is restored
    avail_restored = get_doctors_availability(specialization="Cardiology", db=db_session)
    doc_restored = next(d for d in avail_restored["doctors"] if d["doctorId"] == doc["doctorId"])
    assert slot_to_book in doc_restored["availableSlotsToday"]

def test_get_appointment_not_found(db_session):
    with pytest.raises(HTTPException) as exc_info:
        get_appointment_by_id(id="NON-EXISTENT-ID", db=db_session)
    assert exc_info.value.status_code == 404

def test_get_call_records(db_session):
    records = get_call_records(db=db_session)
    assert isinstance(records, list)
