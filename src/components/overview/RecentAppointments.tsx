import React from 'react';
import { Appointment } from '../../types';
import { 
  Phone, 
  Calendar, 
  Clock, 
  Sparkles, 
  ArrowUpRight, 
  AlertCircle, 
  CheckCircle2, 
  Clock4, 
  XCircle 
} from 'lucide-react';

interface RecentAppointmentsProps {
  appointments: Appointment[];
  onViewAll?: () => void;
  onSelectAppointment?: (appointment: Appointment) => void;
}

export const RecentAppointments: React.FC<RecentAppointmentsProps> = ({
  appointments,
  onViewAll,
  onSelectAppointment,
}) => {
  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Confirmed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-[#0D9488] border border-teal-200">
            <Clock4 className="w-3 h-3 animate-spin" />
            In Progress
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" />
            Cancelled
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base text-[#172033]">Recent Appointments</h3>
          <p className="text-xs text-[#64748B] mt-0.5">
            Patient bookings, scheduling confirmations, and automated cancellations
          </p>
        </div>

        {onViewAll && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-xs font-semibold text-[#0D9488] hover:text-[#0F766E] transition-colors"
          >
            <span>View all</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Table / List */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              <th className="py-3 px-6">Patient & Contact</th>
              <th className="py-3 px-6">Doctor & Department</th>
              <th className="py-3 px-6">Date & Slot</th>
              <th className="py-3 px-6">Channel</th>
              <th className="py-3 px-6">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {appointments.slice(0, 5).map((apt) => (
              <tr 
                key={apt.id} 
                onClick={() => onSelectAppointment?.(apt)}
                className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
              >
                {/* Patient */}
                <td className="py-3.5 px-6">
                  <div className="font-semibold text-[#172033] group-hover:text-[#0D9488] transition-colors">
                    {apt.patientName}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-[#64748B] mt-0.5 font-mono">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{apt.patientPhone}</span>
                  </div>
                </td>

                {/* Doctor */}
                <td className="py-3.5 px-6">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={apt.doctorAvatar}
                      alt={apt.doctorName}
                      className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-200"
                    />
                    <div>
                      <div className="font-medium text-[#172033]">{apt.doctorName}</div>
                      <div className="text-[11px] text-[#64748B]">{apt.doctorSpecialization}</div>
                    </div>
                  </div>
                </td>

                {/* Date & Time */}
                <td className="py-3.5 px-6">
                  <div className="flex items-center gap-1.5 text-[#172033] font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{apt.dateTime}</span>
                  </div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">
                    {apt.timeSlot} ({apt.durationMinutes}m)
                  </div>
                </td>

                {/* Booking Channel */}
                <td className="py-3.5 px-6">
                  {apt.bookedVia === 'ai_voice' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-teal-50 text-[#0D9488] border border-teal-200/70">
                      <Sparkles className="w-3 h-3" />
                      AI Voice
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      Reception
                    </span>
                  )}
                </td>

                {/* Status */}
                <td className="py-3.5 px-6">
                  {getStatusBadge(apt.status)}
                  {apt.status === 'cancelled' && apt.cancellationReason && (
                    <div className="text-[10px] text-rose-600 mt-1 max-w-[160px] truncate" title={apt.cancellationReason}>
                      {apt.cancellationReason}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
