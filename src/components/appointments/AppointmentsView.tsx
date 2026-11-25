import React, { useState, useEffect } from 'react';
import { Appointment, AppointmentStatus, Doctor } from '../../types';
import { 
  Calendar, 
  Phone, 
  Search, 
  Clock, 
  CheckCircle2, 
  Clock4, 
  XCircle, 
  Sparkles, 
  Plus, 
  X
} from 'lucide-react';

interface AppointmentsViewProps {
  appointments: Appointment[];
  searchQuery?: string;
  doctors?: Doctor[];
  onAppointmentCreated?: (newApt: Appointment) => void;
  onAppointmentCancelled?: (id: string, reason: string) => void;
}

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  appointments,
  searchQuery = '',
  doctors = [],
  onAppointmentCreated,
  onAppointmentCancelled,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [localSearch, setLocalSearch] = useState<string>(searchQuery);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showNewModal, setShowNewModal] = useState<boolean>(false);

  // New appointment form state
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [selectedDocId, setSelectedDocId] = useState(doctors[0]?.id || 'doc-1');
  const [aptTimeSlot, setAptTimeSlot] = useState('02:00 PM - 02:30 PM');
  const [symptoms, setSymptoms] = useState('');
  const [cancelReasonInput, setCancelReasonInput] = useState('');

  // Sync external search query
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch = 
      apt.patientName.toLowerCase().includes(localSearch.toLowerCase()) ||
      apt.patientPhone.includes(localSearch) ||
      apt.doctorName.toLowerCase().includes(localSearch.toLowerCase()) ||
      apt.doctorSpecialization.toLowerCase().includes(localSearch.toLowerCase());

    const matchesStatus = filterStatus === 'all' || apt.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Confirmed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-[#0D9488] border border-teal-200">
            <Clock4 className="w-3.5 h-3.5 animate-spin" />
            In Progress
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
    }
  };

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !patientPhone) return;

    const chosenDoc = doctors.find(d => d.id === selectedDocId) || {
      id: 'doc-1',
      name: 'Dr. Sarah Chen',
      specialization: 'Cardiology',
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=256&h=256',
      roomNumber: 'Suite 402'
    };

    const newApt: Appointment = {
      id: `apt-${Date.now().toString().slice(-4)}`,
      patientName,
      patientPhone,
      doctorId: chosenDoc.id,
      doctorName: chosenDoc.name,
      doctorSpecialization: chosenDoc.specialization,
      doctorAvatar: chosenDoc.avatar,
      dateTime: 'Today, ' + aptTimeSlot.split(' - ')[0],
      timeSlot: aptTimeSlot,
      durationMinutes: 30,
      status: 'confirmed',
      bookedVia: 'reception_manual',
      symptoms: symptoms || 'General follow-up consultation',
      roomNumber: chosenDoc.roomNumber
    };

    onAppointmentCreated?.(newApt);
    setShowNewModal(false);
    setPatientName('');
    setPatientPhone('');
    setSymptoms('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#172033] tracking-tight">
              Patient Appointments
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-[#0D9488] border border-teal-200">
              {filteredAppointments.length} Bookings
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Complete schedule tracking, patient telephone records, and voice AI automated booking audit log.
          </p>
        </div>

        <button 
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Appointment</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search patient, phone (+1 ...), doctor, symptoms..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-[#172033] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] focus:bg-white transition-all"
          />
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all whitespace-nowrap ${
                filterStatus === status
                  ? 'bg-teal-50 text-[#0D9488] font-semibold border border-teal-200'
                  : 'bg-slate-50 text-[#64748B] border border-slate-200 hover:text-[#172033]'
              }`}
            >
              {status === 'all' ? 'All Bookings' : status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Appointments Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                <th className="py-3.5 px-6">Patient Name & Phone</th>
                <th className="py-3.5 px-6">Doctor</th>
                <th className="py-3.5 px-6">Date & Time</th>
                <th className="py-3.5 px-6">Source</th>
                <th className="py-3.5 px-6">Status / Cancellation Note</th>
                <th className="py-3.5 px-6 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredAppointments.map((apt) => (
                <tr 
                  key={apt.id}
                  onClick={() => setSelectedAppointment(apt)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  {/* Patient Phone & Name */}
                  <td className="py-4 px-6">
                    <div className="font-semibold text-sm text-[#172033] group-hover:text-[#0D9488] transition-colors">
                      {apt.patientName}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#64748B] mt-0.5 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{apt.patientPhone}</span>
                    </div>
                  </td>

                  {/* Doctor */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={apt.doctorAvatar}
                        alt={apt.doctorName}
                        className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200"
                      />
                      <div>
                        <div className="font-medium text-[#172033]">{apt.doctorName}</div>
                        <div className="text-[11px] text-[#64748B]">{apt.doctorSpecialization}</div>
                      </div>
                    </div>
                  </td>

                  {/* Date & Time */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1.5 font-semibold text-[#172033]">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{apt.dateTime}</span>
                    </div>
                    <div className="text-[11px] text-[#64748B] mt-0.5">
                      {apt.timeSlot} ({apt.durationMinutes} min)
                    </div>
                  </td>

                  {/* Channel */}
                  <td className="py-4 px-6">
                    {apt.bookedVia === 'ai_voice' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-teal-50 text-[#0D9488] border border-teal-200">
                        <Sparkles className="w-3 h-3" />
                        AI Voice
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        Reception
                      </span>
                    )}
                  </td>

                  {/* Booking / Cancellation Status */}
                  <td className="py-4 px-6">
                    <div>{getStatusBadge(apt.status)}</div>
                    {apt.status === 'cancelled' && apt.cancellationReason && (
                      <div className="text-[11px] text-rose-600 mt-1 max-w-xs font-medium">
                        {apt.cancellationReason}
                      </div>
                    )}
                  </td>

                  {/* Action */}
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAppointment(apt);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-[#0D9488] hover:bg-teal-50 rounded-lg transition-colors"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-elevated w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setSelectedAppointment(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#64748B] hover:text-[#172033] hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Calendar className="w-5 h-5 text-[#0D9488]" />
              <h3 className="font-bold text-base text-[#172033]">Appointment Details</h3>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#64748B]">Booking Reference</span>
                <span className="font-mono font-semibold text-[#172033]">{selectedAppointment.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#64748B]">Patient Name</span>
                <span className="font-semibold text-[#172033]">{selectedAppointment.patientName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#64748B]">Patient Phone</span>
                <span className="font-mono font-semibold text-[#172033]">{selectedAppointment.patientPhone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#64748B]">Assigned Physician</span>
                <span className="font-semibold text-[#0D9488]">{selectedAppointment.doctorName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#64748B]">Date & Slot</span>
                <span className="font-semibold text-[#172033]">{selectedAppointment.dateTime} ({selectedAppointment.timeSlot})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#64748B]">Consultation Suite</span>
                <span className="text-[#172033]">{selectedAppointment.roomNumber || 'TBD'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#64748B]">Status</span>
                <div>{getStatusBadge(selectedAppointment.status)}</div>
              </div>
              {selectedAppointment.symptoms && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[#64748B] block mb-1">Reported Symptoms:</span>
                  <p className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-[#172033] leading-relaxed">
                    {selectedAppointment.symptoms}
                  </p>
                </div>
              )}
              {selectedAppointment.cancellationReason && (
                <div className="pt-1">
                  <span className="text-rose-600 font-semibold block mb-1">Cancellation Detail:</span>
                  <p className="bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-rose-800 leading-relaxed">
                    {selectedAppointment.cancellationReason}
                  </p>
                </div>
              )}
              {selectedAppointment.status !== 'cancelled' && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[#64748B] block mb-1">Cancel Consultation:</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Reason for cancellation..."
                      value={cancelReasonInput}
                      onChange={(e) => setCancelReasonInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#172033] focus:outline-none focus:border-rose-400"
                    />
                    <button
                      onClick={() => {
                        onAppointmentCancelled?.(selectedAppointment.id, cancelReasonInput || 'Cancelled by staff');
                        setSelectedAppointment({
                          ...selectedAppointment,
                          status: 'cancelled',
                          cancellationReason: cancelReasonInput || 'Cancelled by staff'
                        });
                        setCancelReasonInput('');
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold whitespace-nowrap"
                    >
                      Cancel Slot
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedAppointment(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#172033] rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Appointment Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-elevated w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowNewModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#64748B] hover:text-[#172033] hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Calendar className="w-5 h-5 text-[#0D9488]" />
              <h3 className="font-bold text-base text-[#172033]">Book New Appointment</h3>
            </div>

            <form onSubmit={handleCreateAppointment} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#172033] mb-1">Patient Full Name</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Johnathan Doe"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#172033] focus:outline-none focus:border-[#0D9488]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">Patient Phone Number</label>
                <input
                  type="text"
                  required
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-[#172033] focus:outline-none focus:border-[#0D9488]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">Physician</label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#172033] font-medium focus:outline-none focus:border-[#0D9488]"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.specialization} ({d.roomNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">Time Slot (Today)</label>
                <select
                  value={aptTimeSlot}
                  onChange={(e) => setAptTimeSlot(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#172033] font-medium focus:outline-none focus:border-[#0D9488]"
                >
                  <option value="02:00 PM - 02:30 PM">02:00 PM - 02:30 PM</option>
                  <option value="02:30 PM - 03:00 PM">02:30 PM - 03:00 PM</option>
                  <option value="03:00 PM - 03:30 PM">03:00 PM - 03:30 PM</option>
                  <option value="03:30 PM - 04:00 PM">03:30 PM - 04:00 PM</option>
                  <option value="04:00 PM - 04:30 PM">04:00 PM - 04:30 PM</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">Chief Symptoms / Reason</label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  rows={2}
                  placeholder="Primary complaint, symptoms duration..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#172033] focus:outline-none focus:border-[#0D9488]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#172033] rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
