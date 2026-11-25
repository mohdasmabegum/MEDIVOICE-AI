import React from 'react';
import { BookingSuccessData } from '../../types';
import { 
  Check, 
  Download, 
  Printer, 
  CheckCircle, 
  Calendar, 
  Clock, 
  Phone, 
  User, 
  MapPin, 
  X,
  Sparkles
} from 'lucide-react';
import { downloadAppointmentSlipPDF, printAppointmentSlip } from '../../utils/appointmentSlipGenerator';

interface BookingSuccessModalProps {
  booking: BookingSuccessData | null;
  onClose: () => void;
}

export const BookingSuccessModal: React.FC<BookingSuccessModalProps> = ({ booking, onClose }) => {
  if (!booking) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl border border-emerald-100 shadow-elevated p-6 sm:p-8 relative overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-success-title"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Centered Success Icon & Heading */}
        <div className="flex flex-col items-center text-center">
          {/* Large Green Circular Success Icon */}
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 ring-8 ring-emerald-50 animate-bounce duration-1000">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>
          </div>

          <h2 id="booking-success-title" className="text-2xl font-bold text-emerald-700 tracking-tight">
            Appointment Confirmed!
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 max-w-sm">
            Your appointment has been successfully booked through MediVoice AI.
          </p>
        </div>

        {/* Clean Appointment Receipt Card */}
        <div className="mt-6 bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3 text-xs">
          {/* Booking ID and Status Badge */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B] block">Booking Reference ID</span>
              <span className="font-mono text-sm font-bold text-[#0D9488]">{booking.bookingId}</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300/60">
              <CheckCircle className="w-3 h-3" />
              Confirmed
            </span>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <span className="text-[11px] text-[#64748B] block">Patient Name</span>
              <span className="font-semibold text-sm text-[#172033] mt-0.5 block truncate">
                {booking.patientName || 'Verified Outpatient'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-[#64748B] block">Confirmed Phone</span>
              <span className="font-mono font-semibold text-sm text-[#172033] mt-0.5 block">
                {booking.patientPhone}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-[#64748B] block">Doctor</span>
              <span className="font-semibold text-sm text-[#0D9488] mt-0.5 block truncate">
                {booking.doctorName}
              </span>
              <span className="text-[10px] text-[#64748B]">{booking.doctorSpecialization}</span>
            </div>

            <div>
              <span className="text-[11px] text-[#64748B] block">Date & Time</span>
              <span className="font-semibold text-sm text-[#172033] mt-0.5 block">
                {booking.appointmentDate}
              </span>
              <span className="text-[11px] text-[#64748B] font-mono">{booking.appointmentTime}</span>
            </div>
          </div>

          {booking.roomNumber && (
            <div className="pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px] text-[#64748B]">
              <MapPin className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>Location: <strong>{booking.roomNumber}</strong></span>
            </div>
          )}
        </div>

        {/* Three Required Actions */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            onClick={() => downloadAppointmentSlipPDF(booking)}
            className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-[#172033] border border-slate-200/90 rounded-xl text-xs font-semibold shadow-subtle transition-all hover:border-[#0D9488]"
          >
            <Download className="w-4 h-4 text-[#0D9488]" />
            <span>Download Slip (PDF)</span>
          </button>

          <button
            onClick={() => printAppointmentSlip(booking)}
            className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-[#172033] border border-slate-200/90 rounded-xl text-xs font-semibold shadow-subtle transition-all hover:border-[#0D9488]"
          >
            <Printer className="w-4 h-4 text-[#0D9488]" />
            <span>Print Slip</span>
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl text-xs font-semibold shadow-md shadow-teal-700/20 transition-all hover:scale-[1.02]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
