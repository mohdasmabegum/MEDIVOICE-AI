import React from 'react';
import { Doctor } from '../../types';
import { UserCheck, Star, Clock, Calendar, ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface AvailableDoctorsProps {
  doctors: Doctor[];
  onViewAll?: () => void;
  onSelectDoctor?: (doctor: Doctor) => void;
}

export const AvailableDoctors: React.FC<AvailableDoctorsProps> = ({
  doctors,
  onViewAll,
  onSelectDoctor,
}) => {
  const availableDocs = doctors.filter((d) => d.status === 'available');

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base text-[#172033]">Available Doctors</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {availableDocs.length} On Duty
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Physicians currently open for real-time AI scheduling
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

      {/* Doctors Grid / List */}
      <div className="p-4 divide-y divide-slate-100">
        {availableDocs.slice(0, 4).map((doc) => (
          <div
            key={doc.id}
            onClick={() => onSelectDoctor?.(doc)}
            className="p-3 rounded-xl hover:bg-slate-50/80 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={doc.avatar}
                  alt={doc.name}
                  className="w-11 h-11 rounded-xl object-cover ring-1 ring-slate-200"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white"></span>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-semibold text-sm text-[#172033] group-hover:text-[#0D9488] transition-colors">
                    {doc.name}
                  </h4>
                  <span className="text-[10px] text-[#64748B] font-mono">{doc.title}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#64748B] mt-0.5">
                  <span>{doc.specialization}</span>
                  <span>•</span>
                  <span className="flex items-center gap-0.5 text-amber-600 font-medium">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    {doc.rating}
                  </span>
                </div>
              </div>
            </div>

            {/* Slots and Location */}
            <div className="flex items-center gap-4 text-xs sm:text-right">
              <div>
                <div className="flex items-center sm:justify-end gap-1 text-[#0D9488] font-medium">
                  <Clock className="w-3 h-3" />
                  <span>Next: {doc.nextAvailableSlot}</span>
                </div>
                <div className="text-[11px] text-[#64748B] mt-0.5">
                  {doc.roomNumber}
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-1">
                {doc.slotsToday.slice(0, 2).map((slot, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-teal-50 text-[#0D9488] text-[11px] font-medium border border-teal-200/60"
                  >
                    {slot}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
