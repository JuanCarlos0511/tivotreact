import React from 'react';
import type { ActiveTab } from '../../types/analytics';
import { BarChart3, Users, Download, BookOpen } from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export function Sidebar({ activeTab, onSelectTab }: SidebarProps) {
  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard Analítico', icon: BarChart3, desc: 'Curvas, KPIs y TAM' },
    { id: 'participants' as ActiveTab, label: 'Participantes', icon: Users, desc: 'Muestra anónima y progreso' },
    { id: 'export' as ActiveTab, label: 'Centro de Exportación', icon: Download, desc: 'CSV, JSONL y Excel' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <nav className="space-y-1.5">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Módulos de Estudio
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
                isActive
                  ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              }`}
            >
              <Icon className={`w-5 h-5 mt-0.5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
              <div>
                <div className="text-sm leading-tight">{item.label}</div>
                <div className="text-[11px] text-slate-400 font-normal mt-0.5">{item.desc}</div>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-1">
        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
          <BookOpen className="w-4 h-4 text-emerald-600" />
          <span>Paper 2026</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500">
          IEEE RITA / EDUCON / Computers & Education.
        </p>
      </div>
    </aside>
  );
}
