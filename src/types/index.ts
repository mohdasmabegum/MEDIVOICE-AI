export type DoctorStatus = 'available' | 'in_consultation' | 'off_duty';

export interface Doctor {
  id: string;
  name: string;
  title: string;
  specialization: string;
  department: string;
  avatar: string;
  status: DoctorStatus;
  rating: number;
  totalPatients: number;
  experienceYears: number;
  contact: string;
  email: string;
  roomNumber: string;
  nextAvailableSlot: string;
  availableDays: string[];
  slotsToday: string[];
}

export type AppointmentStatus = 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  doctorAvatar: string;
  dateTime: string; // ISO date string or formatted
  timeSlot: string;
  durationMinutes: number;
  status: AppointmentStatus;
  bookedVia: 'ai_voice' | 'reception_manual' | 'patient_portal';
  symptoms?: string;
  notes?: string;
  cancellationReason?: string;
  roomNumber?: string;
}

export type CallOutcome = 
  | 'appointment_booked'
  | 'appointment_rescheduled'
  | 'appointment_cancelled'
  | 'inquiry_answered'
  | 'transferred_to_staff'
  | 'call_dropped';

export interface CallRecord {
  id: string;
  callerPhone: string;
  callerName: string;
  timestamp: string;
  durationSeconds: number;
  outcome: CallOutcome;
  doctorId?: string;
  doctorName?: string;
  doctorSpecialization?: string;
  appointmentId?: string;
  summary: string;
  sentiment: 'positive' | 'neutral' | 'urgent';
  audioWaveformData?: number[];
  transcript?: Array<{
    speaker: 'assistant' | 'caller';
    time: string;
    text: string;
  }>;
}

export interface DashboardStats {
  totalDoctors: number;
  availableDoctors: number;
  todayAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  totalCallsToday: number;
  aiHandledRatePercentage: number;
  avgCallDurationSeconds: number;
}

export type ActiveTab = 
  | 'overview'
  | 'assistant'
  | 'doctors'
  | 'appointments'
  | 'call-history'
  | 'settings';

export type CallState = 
  | 'idle'
  | 'requesting_mic'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'speech_detected'
  | 'processing_audio'
  | 'transcribing'
  | 'generating_response'
  | 'ai_speaking'
  | 'ready_for_next_input'
  | 'processing'
  | 'ended'
  | 'error';

export interface BookingSuccessData {
  bookingId: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  doctorAvatar?: string;
  appointmentDate: string;
  appointmentTime: string;
  bookingStatus: 'confirmed' | 'pending';
  roomNumber?: string;
  symptoms?: string;
  bookedAt: string;
  clinicName: string;
  clinicAddress: string;
}

export interface CancellationSuccessData {
  bookingId: string;
  patientPhone: string;
  doctorName: string;
  doctorSpecialization: string;
  appointmentDate: string;
  appointmentTime: string;
  cancellationStatus: 'cancelled';
  cancelledAt: string;
  reason?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

export interface TranscriptTurn {
  id: string;
  speaker: 'assistant' | 'user' | 'system';
  text: string;
  time: string;
}
