import React, { useState, useEffect } from 'react';
import { 
  Bot,
  CheckCircle2, 
  Calendar, 
  PhoneCall,
  Headphones,
  Maximize2,
  FileText
} from 'lucide-react';
import { apiService } from '../../services/api';
import { Doctor } from '../../types';

interface AssistantViewProps {
  doctors?: Doctor[];
  onOpenFullScreenCall?: () => void;
}

export const AssistantView: React.FC<AssistantViewProps> = ({
  onOpenFullScreenCall,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    apiService.checkPipecatBackendStatus().then((status) => {
      if (isMounted) {
        setIsOnline(status.online);
      }
    });
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#172033] tracking-tight">
              Alex — AI Voice Assistant
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Speak naturally with Alex for live doctor availability, appointment booking, and cancellations.
          </p>
        </div>

        {/* Status notice */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-teal-50 text-teal-800 border border-teal-200/80 rounded-xl text-xs font-medium self-start sm:self-auto">
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span>{isOnline ? 'Alex is Online' : 'Connecting...'}</span>
        </div>
      </div>

      {/* Main Calling Stage Card */}
      <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-card p-6 sm:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-50/50 rounded-full blur-3xl pointer-events-none -z-0" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-50/40 rounded-full blur-3xl pointer-events-none -z-0" />

        <div className="relative z-10 max-w-xl flex flex-col items-center">
          {/* Central AI Assistant Avatar */}
          <div className="relative my-4">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-[#0D9488] to-[#14B8A6] flex items-center justify-center text-white shadow-elevated ring-8 ring-teal-50/80">
              <Bot className="w-12 h-12 sm:w-16 sm:h-16" />
            </div>
            <span className="absolute bottom-2 right-2 w-5 h-5 rounded-full bg-emerald-500 ring-4 ring-white" title="Alex Online" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-[#172033] mt-2">
            Alex • Metropolitan Health Clinic Receptionist
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1.5 leading-relaxed">
            Click below to start a live voice call with Alex for doctor schedule lookup, appointment booking, and instant cancellations.
          </p>

          {/* Status Pills */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Microphone Ready
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 font-medium">
              <Bot className="w-3.5 h-3.5 text-[#0D9488]" />
              24/7 Appointment Support
            </span>
          </div>

          {/* Primary Call Launcher Button */}
          <div className="mt-8 flex items-center gap-3">
            <button
              onClick={onOpenFullScreenCall}
              className="flex items-center gap-2.5 px-8 py-3.5 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-2xl font-semibold text-sm sm:text-base shadow-lg shadow-teal-700/25 transition-all hover:scale-[1.03] hover:shadow-xl"
            >
              <Headphones className="w-5 h-5" />
              <span>Call Alex Now</span>
              <Maximize2 className="w-4 h-4 opacity-70 ml-1" />
            </button>
          </div>
        </div>

        {/* Feature Grid Underneath */}
        <div className="w-full mt-10 pt-8 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center gap-2 font-semibold text-xs text-[#172033]">
              <Calendar className="w-4 h-4 text-[#0D9488]" />
              <span>Real-Time Doctor Check</span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">
              Checks live doctor rosters, specialty departments, and immediately reports remaining open slots.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center gap-2 font-semibold text-xs text-[#172033]">
              <PhoneCall className="w-4 h-4 text-[#0D9488]" />
              <span>Verbal Confirmation</span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">
              Collects the caller's phone number, repeats it verbally for verification, and books only upon confirmation.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center gap-2 font-semibold text-xs text-[#172033]">
              <FileText className="w-4 h-4 text-[#0D9488]" />
              <span>PDF Appointment Slips</span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">
              Instant generation of downloadable & printable clinical receipts upon successful reservation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
