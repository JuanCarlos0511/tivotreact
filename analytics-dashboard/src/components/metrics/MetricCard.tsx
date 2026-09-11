import type { ReactNode } from 'react';
import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    type: 'success' | 'warning' | 'info' | 'neutral';
  };
  children?: ReactNode;
}

export function MetricCard({ title, value, subtitle, icon: Icon, badge, children }: MetricCardProps) {
  const badgeStyles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
          <Icon className="w-5 h-5 text-emerald-600" />
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</div>
        {badge && (
          <span className={`text-xs px-2 py-0.5 rounded-md font-semibold border ${badgeStyles[badge.type]}`}>
            {badge.text}
          </span>
        )}
      </div>

      {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
      {children && <div className="mt-3 pt-3 border-t border-slate-100">{children}</div>}
    </div>
  );
}
