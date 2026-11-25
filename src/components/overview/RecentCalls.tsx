import React, { useState } from 'react';
import { CallRecord } from '../../types';
import { 
  PhoneCall, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  ArrowUpRight, 
  PhoneForwarded, 
  ChevronDown, 
  ChevronUp,
  FileText
} from 'lucide-react';

interface RecentCallsProps {
  calls: CallRecord[];
  onViewAll?: () => void;
}

export const RecentCalls: React.FC<RecentCallsProps> = ({ calls, onViewAll }) => {
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);

  const getOutcomeBadge = (outcome: CallRecord['outcome']) => {
    switch (outcome) {
      case 'appointment_booked':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Booked
          </span>
        );
      case 'appointment_cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" />
            Cancelled
          </span>
        );
      case 'appointment_rescheduled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            Rescheduled
          </span>
        );
      case 'inquiry_answered':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            <HelpCircle className="w-3 h-3" />
            Inquiry Resolved
          </span>
        );
      case 'transferred_to_staff':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-[#0D9488] border border-teal-200">
            <PhoneForwarded className="w-3 h-3" />
            Transferred
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
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
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base text-[#172033]">Recent AI Voice Calls</h3>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0D9488]"></span>
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Recent patient voice calls handled by Alex
          </p>
        </div>

        {onViewAll && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-xs font-semibold text-[#0D9488] hover:text-[#0F766E] transition-colors"
          >
            <span>View call logs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Call List */}
      <div className="divide-y divide-slate-100">
        {calls.slice(0, 4).map((call) => {
          const isExpanded = expandedCallId === call.id;

          return (
            <div key={call.id} className="p-4 hover:bg-slate-50/70 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-[#0D9488]">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs sm:text-sm text-[#172033]">
                        {call.callerName}
                      </span>
                      <span className="font-mono text-xs text-[#64748B]">
                        {call.callerPhone}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#64748B] mt-0.5">
                      <span>{call.timestamp}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatDuration(call.durationSeconds)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {getOutcomeBadge(call.outcome)}
                  <button
                    onClick={() => setExpandedCallId(isExpanded ? null : call.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title={isExpanded ? 'Collapse summary' : 'Expand summary'}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Summary / Transcript Snippet */}
              <div className="mt-2.5 ml-0 sm:ml-12 text-xs text-[#64748B] bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                <p className="leading-relaxed">
                  <span className="font-semibold text-[#172033]">AI Summary: </span>
                  {call.summary}
                </p>

                {isExpanded && call.transcript && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2">
                    <div className="flex items-center gap-1.5 font-semibold text-[#172033] text-[11px]">
                      <FileText className="w-3.5 h-3.5 text-[#0D9488]" />
                      <span>Live Call Transcript Snippet</span>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {call.transcript.map((line, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-[11px]">
                          <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            line.speaker === 'assistant' 
                              ? 'bg-teal-100/70 text-[#0D9488]' 
                              : 'bg-slate-200/70 text-slate-700'
                          }`}>
                            {line.speaker === 'assistant' ? 'MediVoice AI' : 'Caller'}
                          </span>
                          <span className="text-[#172033] leading-tight mt-0.5">{line.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
