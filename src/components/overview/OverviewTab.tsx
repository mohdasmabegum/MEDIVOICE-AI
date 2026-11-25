import React from 'react';
import { 
  Users, 
  UserCheck, 
  CalendarDays, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  PhoneCall, 
  Clock, 
  Download, 
  Plus, 
  ArrowUpRight,
  ShieldCheck,
  Headphones
} from 'lucide-react';
import { StatCard } from './StatCard';
import { AppointmentAnalytics } from './AppointmentAnalytics';
import { RecentAppointments } from './RecentAppointments';
import { AvailableDoctors } from './AvailableDoctors';
import { RecentCalls } from './RecentCalls';
import { DashboardStats, Doctor, Appointment, CallRecord, ActiveTab } from '../../types';

interface OverviewTabProps {
  stats: DashboardStats;
  doctors: Doctor[];
  appointments: Appointment[];
  calls: CallRecord[];
  onNavigateTab: (tab: ActiveTab) => void;
  onSelectAppointment?: (apt: Appointment) => void;
  onSelectDoctor?: (doc: Doctor) => void;
  onStartAICall?: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  stats,
  doctors,
  appointments,
  calls,
  onNavigateTab,
  onSelectAppointment,
  onSelectDoctor,
  onStartAICall,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Overview Welcome & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#172033] tracking-tight">
              Clinical Overview
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Real-time outpatient reception status, physician rosters, and voice scheduling activity.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={onStartAICall || (() => onNavigateTab('assistant'))}
            className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl text-xs font-semibold shadow-sm shadow-teal-600/20 transition-all hover:shadow hover:scale-[1.02]"
          >
            <Headphones className="w-4 h-4" />
            <span>Start AI Call</span>
          </button>

          <button
            onClick={() => onNavigateTab('appointments')}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-[#172033] border border-[#E2E8F0] rounded-xl text-xs font-semibold shadow-subtle transition-all"
          >
            <CalendarDays className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>Schedule</span>
          </button>
        </div>
      </div>

      {/* 5 Required White Statistic Cards (+ Secondary KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Total Doctors */}
        <StatCard
          title="Total Doctors"
          value={stats.totalDoctors}
          subtitle="On clinical roster"
          change="+2 new"
          changeType="positive"
          icon={Users}
          iconBgColor="bg-slate-100"
          iconColor="text-slate-700"
        />

        {/* 2. Available Doctors */}
        <StatCard
          title="Available Doctors"
          value={stats.availableDoctors}
          subtitle="Ready for bookings"
          change="75% on duty"
          changeType="positive"
          icon={UserCheck}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
          badge="Live"
        />

        {/* 3. Today's Appointments */}
        <StatCard
          title="Today's Appointments"
          value={stats.todayAppointments}
          subtitle="Total scheduled"
          change="+14.2%"
          changeType="positive"
          icon={CalendarDays}
          iconBgColor="bg-teal-50"
          iconColor="text-[#0D9488]"
        />

        {/* 4. Completed Appointments */}
        <StatCard
          title="Completed"
          value={stats.completedAppointments}
          subtitle="Consultations logged"
          change="73.8% done"
          changeType="positive"
          icon={CheckCircle2}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />

        {/* 5. Cancelled Appointments */}
        <StatCard
          title="Cancelled"
          value={stats.cancelledAppointments}
          subtitle="Auto-rescheduled / freed"
          change="-1 vs avg"
          changeType="positive"
          icon={XCircle}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
        />
      </div>

      {/* Auxiliary AI Voice Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-card">
        <div className="flex items-center gap-3.5 px-3 py-1">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-[#0D9488]">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-[#172033]">{stats.totalCallsToday}</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-[#0D9488] border border-teal-200/60">
                Today
              </span>
            </div>
            <p className="text-xs text-[#64748B]">Total inbound AI patient calls</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 px-3 py-1 border-t sm:border-t-0 sm:border-l border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-[#172033]">{stats.aiHandledRatePercentage}%</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Resolution
              </span>
            </div>
            <p className="text-xs text-[#64748B]">Automated without receptionist routing</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 px-3 py-1 border-t sm:border-t-0 sm:border-l border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-[#172033]">{stats.avgCallDurationSeconds}s</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                Avg time
              </span>
            </div>
            <p className="text-xs text-[#64748B]">Fastest triage & confirmation speed</p>
          </div>
        </div>
      </div>

      {/* Appointment Analytics Chart Section */}
      <AppointmentAnalytics />

      {/* 2-Column Split: Recent Appointments & Available Doctors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentAppointments
            appointments={appointments}
            onViewAll={() => onNavigateTab('appointments')}
            onSelectAppointment={onSelectAppointment}
          />
        </div>

        <div className="lg:col-span-1">
          <AvailableDoctors
            doctors={doctors}
            onViewAll={() => onNavigateTab('doctors')}
            onSelectDoctor={onSelectDoctor}
          />
        </div>
      </div>

      {/* Recent AI Calls Section */}
      <RecentCalls
        calls={calls}
        onViewAll={() => onNavigateTab('call-history')}
      />
    </div>
  );
};
