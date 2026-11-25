import React, { useState } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { mockHourlyAnalytics, mockWeeklyAnalytics } from '../../data/mockData';
import { BarChart3, TrendingUp, Clock, Calendar } from 'lucide-react';

export const AppointmentAnalytics: React.FC = () => {
  const [chartView, setChartView] = useState<'weekly' | 'hourly'>('weekly');

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-card">
      {/* Header and Toggle Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base text-[#172033]">Appointment & Voice Analytics</h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-teal-50 text-[#0D9488] border border-teal-200">
              <TrendingUp className="w-3 h-3" />
              Live Telemetry
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Monitor real-time patient booking trends and AI voice dispatch rates
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl self-start sm:self-auto border border-slate-200/60">
          <button
            onClick={() => setChartView('weekly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              chartView === 'weekly'
                ? 'bg-white text-[#172033] shadow-xs font-semibold'
                : 'text-[#64748B] hover:text-[#172033]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-[#0D9488]" />
            7-Day Trends
          </button>
          <button
            onClick={() => setChartView('hourly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              chartView === 'hourly'
                ? 'bg-white text-[#172033] shadow-xs font-semibold'
                : 'text-[#64748B] hover:text-[#172033]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#0D9488]" />
            Hourly Traffic
          </button>
        </div>
      </div>

      {/* Analytics Chart Container */}
      <div className="mt-6 h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartView === 'weekly' ? (
            <AreaChart data={mockWeeklyAnalytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0D9488" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0D9488" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorBooked" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12, fill: '#64748B' }} 
                axisLine={{ stroke: '#E2E8F0' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#64748B' }} 
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.08)',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                  color: '#172033',
                  padding: '10px 14px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="aiCalls" 
                name="AI Voice Calls" 
                stroke="#0D9488" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorCalls)" 
              />
              <Area 
                type="monotone" 
                dataKey="totalBooked" 
                name="Appointments Booked" 
                stroke="#14B8A6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorBooked)" 
              />
            </AreaChart>
          ) : (
            <BarChart data={mockHourlyAnalytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 12, fill: '#64748B' }} 
                axisLine={{ stroke: '#E2E8F0' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#64748B' }} 
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.08)',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                  color: '#172033',
                  padding: '10px 14px'
                }}
              />
              <Bar dataKey="totalCalls" name="Total Calls" fill="#0D9488" radius={[4, 4, 0, 0]} />
              <Bar dataKey="bookings" name="Bookings" fill="#14B8A6" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Legend & Quick Metrics */}
      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-[#64748B] block">Peak Booking Window</span>
          <span className="font-semibold text-[#172033] mt-0.5 block">10:00 AM – 11:30 AM</span>
        </div>
        <div>
          <span className="text-[#64748B] block">Avg. Booking Conversion</span>
          <span className="font-semibold text-emerald-600 mt-0.5 block">82.4% Completion</span>
        </div>
        <div>
          <span className="text-[#64748B] block">Automated Reschedules</span>
          <span className="font-semibold text-[#172033] mt-0.5 block">12 this week</span>
        </div>
        <div>
          <span className="text-[#64748B] block">AI Auto-Triage Accuracy</span>
          <span className="font-semibold text-[#0D9488] mt-0.5 block">99.1% Clinical Match</span>
        </div>
      </div>
    </div>
  );
};
