import React from 'react';
import type { ScaffoldingItem } from '../../types/analytics';
import { CheckCircle2, Sparkles } from 'lucide-react';

interface Props {
  data: ScaffoldingItem[];
}

export function ScaffoldingChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        Sin registros de pistas solicitadas
      </div>
    );
  }

  const colors: Record<string, { bar: string; text: string; bg: string }> = {
    'Conceptual': { bar: 'bg-indigo-500', text: 'text-indigo-700', bg: 'bg-indigo-50' },
    'Corrección de Sintaxis': { bar: 'bg-sky-500', text: 'text-sky-700', bg: 'bg-sky-50' },
    'Solución Directa': { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Eficacia del Andamiaje IA
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Porcentaje de éxito en la prueba inmediata tras recibir la asistencia
            </p>
          </div>
        </div>

        <div className="space-y-4 my-2">
          {data.map((item) => {
            const style = colors[item.hint_type] || { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' };

            return (
              <div key={item.hint_type} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="font-bold text-slate-800">{item.hint_type}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[11px]">
                      {item.effective_count}/{item.total_requested} exitosas
                    </span>
                    <span className={`font-extrabold text-sm ${style.text}`}>
                      {item.efficacy_pct}%
                    </span>
                  </div>
                </div>

                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${item.efficacy_pct}%` }}
                    className={`${style.bar} h-full transition-all duration-500`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
        <p className="leading-relaxed">
          <strong>Hallazgo Pedagógico:</strong> Las pistas conceptuales fomentan mayor retención algorítmica sin generar sobredependencia en comparación con soluciones directas.
        </p>
      </div>
    </div>
  );
}
