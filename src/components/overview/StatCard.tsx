import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  badge?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  changeType = 'positive',
  icon: Icon,
  iconBgColor = 'bg-teal-50',
  iconColor = 'text-[#0D9488]',
  badge,
}) => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-card hover:shadow-elevated transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
          {title}
        </span>
        <div className={`w-10 h-10 rounded-xl ${iconBgColor} flex items-center justify-center transition-transform group-hover:scale-105`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-bold text-[#172033] tracking-tight">
          {value}
        </span>
        {badge && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {badge}
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between text-xs">
        {change && (
          <div className="flex items-center gap-1 font-medium">
            <span
              className={
                changeType === 'positive'
                  ? 'text-emerald-600'
                  : changeType === 'negative'
                  ? 'text-rose-600'
                  : 'text-slate-500'
              }
            >
              {change}
            </span>
            <span className="text-[#64748B] text-[11px]">vs yesterday</span>
          </div>
        )}
        {subtitle && !change && (
          <span className="text-[#64748B] text-xs">{subtitle}</span>
        )}
      </div>
    </div>
  );
};
