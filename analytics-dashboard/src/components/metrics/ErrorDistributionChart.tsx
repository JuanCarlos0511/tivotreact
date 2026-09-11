import React from 'react';
import type { ErrorTaxonomy } from '../../types/analytics';
import { AlertTriangle } from 'lucide-react';

interface Props {
  data: ErrorTaxonomy;
}

export function ErrorDistributionChart({ data }: Props) {
  if (!data || !data.categories || data.categories.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        Sin errores registrados
      </div>
    );
  }

  const categoryConfig: Record<string, { color: string; tag: string }> = {
    'SYNTAX_ERROR': { color: 'bg-rose-500', tag: 'bg-rose-50 text-rose-700 border-rose-200' },
    'LOGIC_BUSINESS_RULE': { color: 'bg-amber-500', tag: 'bg-amber-50 text-amber-700 border-amber-200' },
    'INCOMPLETE_ALGORITHM': { color: 'bg-orange-500', tag: 'bg-orange-50 text-orange-700 border-orange-200' },
    'RUNTIME_EXCEPTION': { color: 'bg-purple-500', tag: 'bg-purple-50 text-purple-700 border-purple-200' },
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Taxonomía de Errores
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribución de dificultades: Sintaxis vs Lógica de Negocio POS
            </p>
          </div>
          <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
            Total: {data.total_errors}
          </span>
        </div>

        {/* Stacked bar visualization */}
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex mb-6 shadow-inner">
          {data.categories.map((cat) => {
            const config = categoryConfig[cat.category] || { color: 'bg-slate-400', tag: '' };
            return (
              <div
                key={cat.category}
                style={{ width: `${cat.percentage}%` }}
                title={`${cat.label}: ${cat.count} (${cat.percentage}%)`}
                className={`${config.color} h-full transition-all duration-500`}
              />
            );
          })}
        </div>

        {/* Detailed items list */}
        <div className="space-y-3">
          {data.categories.map((cat) => {
            const config = categoryConfig[cat.category] || { color: 'bg-slate-400', tag: 'bg-slate-50 text-slate-700 border-slate-200' };

            return (
              <div key={cat.category} className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className={`w-3 h-3 rounded-full ${config.color}`} />
                  <span className="font-semibold text-slate-800">{cat.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-500">{cat.count} err</span>
                  <span className={`px-2 py-0.5 rounded font-bold border text-[11px] ${config.tag}`}>
                    {cat.percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex justify-between">
        <span>Foco de análisis: Lógica POS vs Sintaxis Karel</span>
        <span>Categorizado en tiempo de ejecución</span>
      </div>
    </div>
  );
}
