import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  Menu, 
  CheckCircle2, 
  Radio, 
  SlidersHorizontal,
  ChevronDown,
  Calendar,
  Phone,
  User,
  X
} from 'lucide-react';

interface TopNavbarProps {
  onOpenMobileMenu: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onStartAICall?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onOpenMobileMenu,
  searchQuery,
  onSearchChange,
  onStartAICall,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notifications = [
    {
      id: 'notif-1',
      title: 'Appointment booked via AI',
      desc: 'Emma Watson (+1 555-732-9104) confirmed with Dr. Sarah Chen for 2:30 PM.',
      time: '12m ago',
      type: 'booking',
      unread: true
    },
    {
      id: 'notif-2',
      title: 'Cancellation handled automatically',
      desc: 'Lucas Campbell released 9:00 AM slot. Schedule updated.',
      time: '28m ago',
      type: 'cancel',
      unread: true
    },
    {
      id: 'notif-3',
      title: 'Pipecat latency stable',
      desc: 'Voice pipeline running smoothly at 24ms audio round-trip.',
      time: '1h ago',
      type: 'system',
      unread: false
    }
  ];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] px-4 sm:px-6 flex items-center justify-between transition-all">
      {/* Left: Mobile Menu & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-xl text-[#64748B] hover:text-[#172033] hover:bg-slate-100 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search patients, phone (+1 ...), doctors, symptoms..."
            className="w-full pl-10 pr-12 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-sm text-[#172033] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] focus:bg-white transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-[#94A3B8] bg-white border border-slate-200 rounded">
            <span>⌘K</span>
          </div>
          {searchQuery && (
            <button 
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 sm:hidden"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Right Controls: System Telemetry, Notifications, Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 ml-4">
        {/* Start AI Call button */}
        {onStartAICall && (
          <button
            onClick={onStartAICall}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl text-xs font-semibold shadow-xs transition-all hover:scale-105"
            title="Open Immersive AI Calling Interface"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span className="hidden sm:inline">Start AI Call</span>
            <span className="sm:hidden">Call</span>
          </button>
        )}

        {/* System Connection Status Card */}
        <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-teal-50/70 border border-teal-200/70 text-xs">
          <div className="relative flex h-2.5 w-2.5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0D9488]"></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[#0D9488]">Pipecat System:</span>
            <span className="text-[#172033] font-medium">Online</span>
            <span className="text-[10px] text-slate-500 font-mono">(24ms)</span>
          </div>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className="relative p-2 rounded-xl text-[#64748B] hover:text-[#172033] hover:bg-slate-100 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#0D9488] ring-2 ring-white"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-elevated border border-slate-200/90 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 pb-2.5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm text-[#172033]">Notifications</h4>
                  <span className="px-1.5 py-0.2 text-[11px] font-semibold bg-teal-50 text-[#0D9488] rounded-full">
                    2 New
                  </span>
                </div>
                <button 
                  onClick={() => setShowNotifications(false)}
                  className="text-xs text-[#0D9488] font-medium hover:underline"
                >
                  Mark all read
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className={`p-3.5 hover:bg-slate-50/80 transition-colors ${n.unread ? 'bg-teal-50/20' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-[#172033]">{n.title}</span>
                      <span className="text-[10px] text-slate-600 whitespace-nowrap">{n.time}</span>
                    </div>
                    <p className="text-xs text-[#64748B] mt-1 leading-relaxed">{n.desc}</p>
                  </div>
                ))}
              </div>

              <div className="px-4 pt-2 border-t border-slate-100 text-center">
                <button 
                  onClick={() => setShowNotifications(false)}
                  className="text-xs text-slate-500 hover:text-[#0D9488] font-medium"
                >
                  View complete activity feed
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=120&h=120"
                alt="Dr. Sarah Chen"
                className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white"></span>
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-xs font-semibold text-[#172033]">Dr. Sarah Chen</p>
              <p className="text-[10px] text-[#64748B]">Medical Director</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-elevated border border-slate-200/90 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-[#172033]">Dr. Sarah Chen, MD</p>
                <p className="text-[11px] text-[#64748B] truncate">sarah.chen@medivoice.health</p>
                <div className="mt-1.5 inline-block text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  Role: Administrator
                </div>
              </div>

              <div className="py-1 text-xs text-[#172033]">
                <button 
                  onClick={() => setShowProfileMenu(false)}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2"
                >
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  Clinic Profile
                </button>
                <button 
                  onClick={() => setShowProfileMenu(false)}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                  Voice AI Preferences
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
