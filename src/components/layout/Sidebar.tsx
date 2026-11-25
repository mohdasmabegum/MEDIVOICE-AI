import React from 'react';
import { 
  LayoutDashboard, 
  Mic, 
  UserCheck, 
  CalendarDays, 
  PhoneCall, 
  Settings, 
  Activity, 
  Sparkles,
  ChevronRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { ActiveTab } from '../../types';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  mobileOpen,
  onCloseMobile,
}) => {
  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ElementType;
    badge?: string;
    badgeColor?: string;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'assistant', label: 'AI Voice Assistant', icon: Mic, badge: 'Live Agent', badgeColor: 'bg-teal-50 text-teal-700 border-teal-200' },
    { id: 'doctors', label: 'Doctors', icon: UserCheck, badge: '24' },
    { id: 'appointments', label: 'Appointments', icon: CalendarDays, badge: '42' },
    { id: 'call-history', label: 'Call History', icon: PhoneCall },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside 
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-[#E2E8F0] flex flex-col transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand / Logo Header */}
        <div className="h-16 px-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#0D9488] to-[#14B8A6] flex items-center justify-center text-white shadow-sm shadow-teal-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#172033] text-base tracking-tight">MediVoice</span>
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-[#0D9488] border border-teal-200/60">
                  AI
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#64748B]">Clinical Voice OS</p>
            </div>
          </div>

          <button 
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#172033] hover:bg-slate-100 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clinical Facility Indicator */}
        <div className="px-4 py-3 mx-3 mt-3 bg-slate-50 border border-slate-200/80 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-[#172033] truncate">Metropolitan Health Clinic</span>
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px] text-[#64748B]">
            <span>Branch #04 • Outpatient</span>
            <span className="font-mono text-emerald-600 font-medium">99.8% Uptime</span>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-[#94A3B8] uppercase">
            Platform Menu
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-teal-50/80 text-[#0D9488] font-semibold border border-teal-200/70 shadow-xs'
                    : 'text-[#64748B] hover:text-[#172033] hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-[#0D9488]' : 'text-[#64748B] group-hover:text-[#172033]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                      item.badgeColor
                        ? item.badgeColor
                        : isActive
                        ? 'bg-teal-100 text-[#0D9488] border-teal-200'
                        : 'bg-slate-100 text-[#64748B] border-slate-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer — Pipecat Engine Telemetry */}
        <div className="p-3 border-t border-[#E2E8F0] space-y-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#172033]">
                <Sparkles className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>Pipecat Voice Engine</span>
              </div>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0D9488]"></span>
              </span>
            </div>

            <p className="mt-1 text-[11px] text-[#64748B] leading-relaxed">
              Real-time WebRTC audio pipeline ready for Phase 2 dispatch.
            </p>

            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-[#64748B]">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                HIPAA Guarded
              </span>
              <span className="font-mono text-[10px] text-slate-500">v0.3.4</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
