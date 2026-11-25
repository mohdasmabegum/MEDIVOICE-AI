import React, { useState, useEffect } from 'react';
import { CallRecord, CallOutcome } from '../../types';
import { 
  Clock, 
  Search, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  PhoneForwarded, 
  FileText, 
  X
} from 'lucide-react';

interface CallHistoryViewProps {
  calls: CallRecord[];
  searchQuery?: string;
}

export const CallHistoryView: React.FC<CallHistoryViewProps> = ({
  calls,
  searchQuery = '',
}) => {
  const [filterOutcome, setFilterOutcome] = useState<string>('all');
  const [localSearch, setLocalSearch] = useState<string>(searchQuery);
  const [activeCallDetail, setActiveCallDetail] = useState<CallRecord | null>(null);

  // Sync external search query
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const filteredCalls = calls.filter((c) => {
    const matchesSearch = 
      c.callerName.toLowerCase().includes(localSearch.toLowerCase()) ||
      c.callerPhone.includes(localSearch) ||
      c.summary.toLowerCase().includes(localSearch.toLowerCase());

    const matchesOutcome = filterOutcome === 'all' || c.outcome === filterOutcome;

    return matchesSearch && matchesOutcome;
  });

  const getOutcomeBadge = (outcome: CallOutcome) => {
    switch (outcome) {
      case 'appointment_booked':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Appointment Booked
          </span>
        );
      case 'appointment_cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            Appointment Cancelled
          </span>
        );
      case 'appointment_rescheduled':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            Rescheduled
          </span>
        );
      case 'inquiry_answered':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            <HelpCircle className="w-3.5 h-3.5" />
            General Inquiry Resolved
          </span>
        );
      case 'transferred_to_staff':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-[#0D9488] border border-teal-200">
            <PhoneForwarded className="w-3.5 h-3.5" />
            Transferred to Front Desk
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            Completed
          </span>
        );
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#172033] tracking-tight">
              AI Call History & Transcripts
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-[#0D9488] border border-teal-200">
              {filteredCalls.length} Recorded Calls
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Complete telephony audit log, AI conversation recordings, patient intent triage, and booking outcomes.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search caller phone, name, or keywords..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-[#172033] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Outcomes' },
            { id: 'appointment_booked', label: 'Bookings' },
            { id: 'appointment_cancelled', label: 'Cancellations' },
            { id: 'inquiry_answered', label: 'Inquiries' },
            { id: 'transferred_to_staff', label: 'Transferred' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterOutcome(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                filterOutcome === item.id
                  ? 'bg-teal-50 text-[#0D9488] font-semibold border border-teal-200'
                  : 'bg-slate-50 text-[#64748B] border border-slate-200 hover:text-[#172033]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Call Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                <th className="py-3.5 px-6">Caller & Phone Number</th>
                <th className="py-3.5 px-6">Timestamp & Duration</th>
                <th className="py-3.5 px-6">Call Outcome</th>
                <th className="py-3.5 px-6">Clinical Intent / Summary</th>
                <th className="py-3.5 px-6 text-right">Transcript</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCalls.map((call) => (
                <tr 
                  key={call.id}
                  onClick={() => setActiveCallDetail(call)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <td className="py-4 px-6">
                    <div className="font-semibold text-sm text-[#172033] group-hover:text-[#0D9488] transition-colors">
                      {call.callerName}
                    </div>
                    <div className="font-mono text-xs text-[#64748B] mt-0.5">
                      {call.callerPhone}
                    </div>
                  </td>

                  <td className="py-4 px-6">
                    <div className="font-medium text-[#172033]">{call.timestamp}</div>
                    <div className="flex items-center gap-1 text-[11px] text-[#64748B] mt-0.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formatDuration(call.durationSeconds)}</span>
                    </div>
                  </td>

                  <td className="py-4 px-6">
                    {getOutcomeBadge(call.outcome)}
                  </td>

                  <td className="py-4 px-6 max-w-md">
                    <p className="text-[#64748B] line-clamp-2 leading-relaxed">
                      {call.summary}
                    </p>
                    {call.doctorName && (
                      <span className="inline-block mt-1 text-[11px] font-medium text-[#0D9488]">
                        Physician: {call.doctorName}
                      </span>
                    )}
                  </td>

                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveCallDetail(call);
                      }}
                      className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-[#0D9488] border border-teal-200/60 rounded-lg text-xs font-semibold transition-colors"
                    >
                      View Log
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transcript Modal */}
      {activeCallDetail && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-elevated w-full max-w-lg p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setActiveCallDetail(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#64748B] hover:text-[#172033] hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <FileText className="w-5 h-5 text-[#0D9488]" />
              <div>
                <h3 className="font-bold text-base text-[#172033]">AI Call Audit & Transcript</h3>
                <span className="text-xs text-[#64748B]">Session ID: {activeCallDetail.id}</span>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Caller:</span>
                  <span className="font-semibold text-[#172033]">{activeCallDetail.callerName} ({activeCallDetail.callerPhone})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Duration & Time:</span>
                  <span className="font-semibold text-[#172033]">{formatDuration(activeCallDetail.durationSeconds)} • {activeCallDetail.timestamp}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[#64748B]">Outcome:</span>
                  <div>{getOutcomeBadge(activeCallDetail.outcome)}</div>
                </div>
              </div>

              <div>
                <span className="font-semibold text-[#172033] block mb-1">AI Executive Summary:</span>
                <p className="bg-teal-50/40 p-3 rounded-xl border border-teal-200/60 text-[#172033] leading-relaxed">
                  {activeCallDetail.summary}
                </p>
              </div>

              {activeCallDetail.transcript ? (
                <div>
                  <span className="font-semibold text-[#172033] block mb-1.5">Full Turn-by-Turn Audio Transcript:</span>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {activeCallDetail.transcript.map((line, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                        <div className="flex items-center justify-between text-[10px] text-[#64748B] mb-1">
                          <span className="font-bold text-[#0D9488]">
                            {line.speaker === 'assistant' ? 'MediVoice AI Agent' : 'Patient'}
                          </span>
                          <span className="font-mono">{line.time}</span>
                        </div>
                        <p className="text-[#172033]">{line.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 italic">No expanded transcript lines recorded for this quick voice transaction.</p>
              )}
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveCallDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#172033] rounded-xl text-xs font-semibold"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
