import json
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import create_engine, Column, String, Integer, Float, Text, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from backend.config import DATABASE_URL

# For SQLite, enable check_same_thread=False; for PostgreSQL, enable pool_pre_ping
is_sqlite = DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}
engine_kwargs = {"connect_args": connect_args, "pool_pre_ping": True}
if not is_sqlite:
    engine_kwargs["pool_recycle"] = 300

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class DoctorModel(Base):
    __tablename__ = "doctors"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    title = Column(String, default="")
    specialization = Column(String, nullable=False, index=True)
    department = Column(String, default="")
    avatar = Column(String, default="")
    status = Column(String, default="available") # available, in_consultation, off_duty
    rating = Column(Float, default=4.9)
    total_patients = Column(Integer, default=0)
    experience_years = Column(Integer, default=10)
    contact = Column(String, default="")
    email = Column(String, default="")
    room_number = Column(String, default="")
    next_available_slot = Column(String, default="")
    available_days = Column(Text, default="[]") # JSON string
    slots_today = Column(Text, default="[]") # JSON string

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "title": self.title,
            "specialization": self.specialization,
            "department": self.department,
            "avatar": self.avatar,
            "status": self.status,
            "rating": self.rating,
            "totalPatients": self.total_patients,
            "experienceYears": self.experience_years,
            "contact": self.contact,
            "email": self.email,
            "roomNumber": self.room_number,
            "nextAvailableSlot": self.next_available_slot,
            "availableDays": json.loads(self.available_days or "[]"),
            "slotsToday": json.loads(self.slots_today or "[]"),
        }

class AppointmentModel(Base):
    __tablename__ = "appointments"

    id = Column(String, primary_key=True, index=True)
    patient_name = Column(String, nullable=False)
    patient_phone = Column(String, nullable=False, index=True)
    patient_email = Column(String, default="")
    doctor_id = Column(String, nullable=False, index=True)
    doctor_name = Column(String, nullable=False)
    doctor_specialization = Column(String, nullable=False)
    doctor_avatar = Column(String, default="")
    date_time = Column(String, nullable=False)
    time_slot = Column(String, nullable=False)
    duration_minutes = Column(Integer, default=30)
    status = Column(String, default="confirmed") # confirmed, in_progress, completed, cancelled
    booked_via = Column(String, default="ai_voice")
    symptoms = Column(String, default="")
    notes = Column(String, default="")
    cancellation_reason = Column(String, default="")
    room_number = Column(String, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "patientName": self.patient_name,
            "patientPhone": self.patient_phone,
            "patientEmail": self.patient_email,
            "doctorId": self.doctor_id,
            "doctorName": self.doctor_name,
            "doctorSpecialization": self.doctor_specialization,
            "doctorAvatar": self.doctor_avatar,
            "dateTime": self.date_time,
            "timeSlot": self.time_slot,
            "durationMinutes": self.duration_minutes,
            "status": self.status,
            "bookedVia": self.booked_via,
            "symptoms": self.symptoms,
            "notes": self.notes,
            "cancellationReason": self.cancellation_reason,
            "roomNumber": self.room_number,
        }

class CallRecordModel(Base):
    __tablename__ = "call_records"

    id = Column(String, primary_key=True, index=True)
    caller_phone = Column(String, nullable=False)
    caller_name = Column(String, default="Caller")
    timestamp = Column(String, default="Just now")
    duration_seconds = Column(Integer, default=0)
    outcome = Column(String, default="inquiry_answered")
    doctor_id = Column(String, default="")
    doctor_name = Column(String, default="")
    doctor_specialization = Column(String, default="")
    appointment_id = Column(String, default="")
    summary = Column(Text, default="")
    sentiment = Column(String, default="positive")
    transcript = Column(Text, default="[]") # JSON string

    def to_dict(self):
        return {
            "id": self.id,
            "callerPhone": self.caller_phone,
            "callerName": self.caller_name,
            "timestamp": self.timestamp,
            "durationSeconds": self.duration_seconds,
            "outcome": self.outcome,
            "doctorId": self.doctor_id,
            "doctorName": self.doctor_name,
            "doctorSpecialization": self.doctor_specialization,
            "appointmentId": self.appointment_id,
            "summary": self.summary,
            "sentiment": self.sentiment,
            "transcript": json.loads(self.transcript or "[]"),
        }

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    seed_db_if_empty()

def seed_db_if_empty():
    db = SessionLocal()
    try:
        doctor_count = db.query(DoctorModel).count()
        if doctor_count == 0:
            initial_doctors = [
                DoctorModel(
                    id='doc-1',
                    name='Dr. Sarah Chen',
                    title='MD, FACC',
                    specialization='Cardiology',
                    department='Cardiovascular Medicine',
                    avatar='https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=256&h=256',
                    status='available',
                    rating=4.9,
                    total_patients=1420,
                    experience_years=14,
                    contact='+1 (555) 234-5678',
                    email='sarah.chen@medivoice.health',
                    room_number='Suite 402 - Wing B',
                    next_available_slot='Today, 2:30 PM',
                    available_days=json.dumps(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']),
                    slots_today=json.dumps(['09:00 AM', '11:30 AM', '02:30 PM', '04:00 PM'])
                ),
                DoctorModel(
                    id='doc-2',
                    name='Dr. Marcus Vance',
                    title='MD, PhD',
                    specialization='Neurology',
                    department='Brain & Spine Institute',
                    avatar='https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=256&h=256',
                    status='in_consultation',
                    rating=4.8,
                    total_patients=980,
                    experience_years=11,
                    contact='+1 (555) 345-6789',
                    email='marcus.vance@medivoice.health',
                    room_number='Suite 310 - Wing A',
                    next_available_slot='Today, 4:15 PM',
                    available_days=json.dumps(['Mon', 'Wed', 'Fri']),
                    slots_today=json.dumps(['10:00 AM', '01:00 PM', '04:15 PM'])
                ),
                DoctorModel(
                    id='doc-3',
                    name='Dr. Elena Rostova',
                    title='MD, FAAP',
                    specialization='Pediatrics',
                    department='Children & Adolescent Care',
                    avatar='https://images.unsplash.com/photo-1594824813583-e1d5e3968252?auto=format&fit=crop&q=80&w=256&h=256',
                    status='available',
                    rating=5.0,
                    total_patients=2150,
                    experience_years=16,
                    contact='+1 (555) 456-7890',
                    email='elena.rostova@medivoice.health',
                    room_number='Suite 205 - Pediatric Pavilion',
                    next_available_slot='Today, 3:00 PM',
                    available_days=json.dumps(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']),
                    slots_today=json.dumps(['09:30 AM', '11:00 AM', '03:00 PM', '05:00 PM'])
                ),
                DoctorModel(
                    id='doc-4',
                    name='Dr. James Albright',
                    title='MD, FAAOS',
                    specialization='Orthopedics',
                    department='Joint & Sports Medicine',
                    avatar='https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=256&h=256',
                    status='available',
                    rating=4.7,
                    total_patients=1640,
                    experience_years=18,
                    contact='+1 (555) 567-8901',
                    email='james.albright@medivoice.health',
                    room_number='Suite 104 - Orthopedic Center',
                    next_available_slot='Tomorrow, 09:15 AM',
                    available_days=json.dumps(['Tue', 'Thu', 'Sat']),
                    slots_today=json.dumps(['08:30 AM', '10:45 AM'])
                ),
                DoctorModel(
                    id='doc-5',
                    name='Dr. Priya Patel',
                    title='MD, FAAD',
                    specialization='Dermatology',
                    department='Cutaneous Medicine',
                    avatar='https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=256&h=256',
                    status='off_duty',
                    rating=4.9,
                    total_patients=1890,
                    experience_years=9,
                    contact='+1 (555) 678-9012',
                    email='priya.patel@medivoice.health',
                    room_number='Suite 512 - Clinic Annex',
                    next_available_slot='Tomorrow, 08:30 AM',
                    available_days=json.dumps(['Mon', 'Tue', 'Thu', 'Fri']),
                    slots_today=json.dumps(['08:30 AM', '11:15 AM', '03:45 PM'])
                ),
            ]
            for doc in initial_doctors:
                db.add(doc)
            db.commit()

        apt_count = db.query(AppointmentModel).count()
        if apt_count == 0:
            initial_appointments = [
                AppointmentModel(
                    id='MED-2026-1042',
                    patient_name='Eleanor Davies',
                    patient_phone='+1 (555) 890-1234',
                    patient_email='eleanor.davies@gmail.com',
                    doctor_id='doc-1',
                    doctor_name='Dr. Sarah Chen',
                    doctor_specialization='Cardiology',
                    doctor_avatar='https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=256&h=256',
                    date_time='Today, Nov 24, 2026',
                    time_slot='09:00 AM',
                    duration_minutes=30,
                    status='confirmed',
                    booked_via='ai_voice',
                    symptoms='Follow-up on hypertension management and ECG review',
                    room_number='Suite 402 - Wing B'
                ),
                AppointmentModel(
                    id='MED-2026-1043',
                    patient_name='Robert Sterling',
                    patient_phone='+1 (555) 901-2345',
                    patient_email='rsterling@techcorp.io',
                    doctor_id='doc-3',
                    doctor_name='Dr. Elena Rostova',
                    doctor_specialization='Pediatrics',
                    doctor_avatar='https://images.unsplash.com/photo-1594824813583-e1d5e3968252?auto=format&fit=crop&q=80&w=256&h=256',
                    date_time='Today, Nov 24, 2026',
                    time_slot='11:00 AM',
                    duration_minutes=30,
                    status='confirmed',
                    booked_via='ai_voice',
                    symptoms='Pediatric 6-month wellness check and vaccination',
                    room_number='Suite 205 - Pediatric Pavilion'
                ),
                AppointmentModel(
                    id='MED-2026-1039',
                    patient_name='Sophia Chen',
                    patient_phone='+1 (555) 432-1098',
                    doctor_id='doc-1',
                    doctor_name='Dr. Sarah Chen',
                    doctor_specialization='Cardiology',
                    doctor_avatar='https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=256&h=256',
                    date_time='Today, Nov 24, 2026',
                    time_slot='08:15 AM',
                    duration_minutes=45,
                    status='completed',
                    booked_via='patient_portal',
                    symptoms='Holter monitor detachment and initial report reading',
                    room_number='Suite 402 - Wing B'
                )
            ]
            for apt in initial_appointments:
                db.add(apt)
            db.commit()

        call_count = db.query(CallRecordModel).count()
        if call_count == 0:
            initial_calls = [
                CallRecordModel(
                    id='call-0841',
                    caller_phone='+1 (555) 890-1234',
                    caller_name='Eleanor Davies',
                    timestamp='Today, 08:41 AM',
                    duration_seconds=78,
                    outcome='appointment_booked',
                    doctor_id='doc-1',
                    doctor_name='Dr. Sarah Chen',
                    doctor_specialization='Cardiology',
                    appointment_id='MED-2026-1042',
                    summary='Patient scheduled cardiology follow-up for 09:00 AM. Verbal confirmation provided.',
                    sentiment='positive',
                    transcript=json.dumps([
                        {"speaker": "assistant", "time": "08:41:02", "text": "Good morning, thank you for calling MediVoice Health. How may I assist you today?"},
                        {"speaker": "caller", "time": "08:41:08", "text": "Hi, I need to see Dr. Sarah Chen today if she has any openings."},
                        {"speaker": "assistant", "time": "08:41:14", "text": "Dr. Chen has availability today at 9:00 AM or 11:30 AM. Which suits you best?"},
                        {"speaker": "caller", "time": "08:41:19", "text": "Nine AM works great."},
                        {"speaker": "assistant", "time": "08:41:24", "text": "May I have your phone number to secure the booking?"},
                        {"speaker": "caller", "time": "08:41:29", "text": "It is 555-890-1234."},
                        {"speaker": "assistant", "time": "08:41:35", "text": "Thank you. To confirm, 555-890-1234 for Dr. Sarah Chen at 9:00 AM today. Shall I confirm?"},
                        {"speaker": "caller", "time": "08:41:40", "text": "Yes, please confirm."},
                        {"speaker": "assistant", "time": "08:41:46", "text": "Your appointment is confirmed with booking reference MED-2026-1042. Have a wonderful day!"}
                    ])
                )
            ]
            for c in initial_calls:
                db.add(c)
            db.commit()
    finally:
        db.close()
