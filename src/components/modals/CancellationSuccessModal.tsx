import React from 'react';
import { CancellationSuccessData } from '../../types';
import { 
  CalendarX, 
  X, 
  Check, 
  Clock, 
  Phone, 
  UserCheck, 
  AlertCircle 
} from 'lucide-react';

interface CancellationSuccessModalProps {
  cancellation: CancellationSuccessData | null;
  onClose: () => void;
}

export const CancellationSuccessModal: React.FC<CancellationSuccessModalProps> = ({
  cancellation,
  onClose,
}) => {
  if (!cancellation) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white rounded-3xl border border-rose-100 shadow-elevated p-6 sm:p-8 relative overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancellation-title"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Centered Cancellation Icon & Heading */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/25 ring-8 ring-rose-50">
              <CalendarX className="w-10 h-10 stroke-[2.2]" />
            </div>
          </div>

          <h2 id="cancellation-title" className="text-2xl font-bold text-rose-700 tracking-tight">
            Appointment Cancelled
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 max-w-sm">
            The consultation has been cancelled and the doctor's calendar slot has been released.
          </p>
        </div>

        {/* Cancellation Details Receipt */}
        <div className="mt-6 bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B] block">Previous Booking ID</span>
              <span className="font-mono text-sm font-bold text-slate-800">{cancellation.bookingId}</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
              Cancelled
            </span>
          </div>

          <div className="space-y-2 pt-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[#64748B]">Patient Phone:</span>
              <span className="font-mono font-semibold text-[#172033]">{cancellation.patientPhone}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#64748B]">Physician:</span>
              <span className="font-semibold text-[#172033]">{cancellation.doctorName} ({cancellation.doctorSpecialization})</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#64748B]">Date & Slot:</span>
              <span className="font-semibold text-[#172033]">{cancellation.appointmentDate} • {cancellation.appointmentTime}</span>
            </div>

            {cancellation.reason && (
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-[11px] text-[#64748B] block mb-1">Reason:</span>
                <p className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-200/60 text-rose-900 leading-relaxed font-medium">
                  {cancellation.reason}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
