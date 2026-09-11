import React from 'react';
import type { SurveySummary } from '../../types/analytics';
import { Award, CheckCheck } from 'lucide-react';

interface Props {
  data: SurveySummary;
}

export function SurveyLikertChart({ data }: Props) {
  if (!data || data.sample_size === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        No hay encuestas TAM/SUS registradas aún
      </div>
    );
  }

  const tamDimensions = [
    data.tam?.perceived_usefulness,
    data.tam?.perceived_ease_of_use,
    data.tam?.ai_trust,
  ].filter(Boolean);

  const susMean = data.sus?.mean || 0;
  const isSusAcceptable = susMean >= 68;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-bold text-slate-900 text-base">Evaluación TAM & Escala SUS</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Percepción de tecnología (1-5) y usabilidad de software (0-100)
          </p>
        </div>
        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto border border-slate-200">
          Muestra evaluada: n={data.sample_size}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TAM Dimensions (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Dimensiones TAM (Media sobre 5.0)
          </div>

          {tamDimensions.map((dim) => {
            if (!dim) return null;
            const pct = Math.min((dim.mean / 5.0) * 100, 100);

            return (
              <div key={dim.label} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="font-semibold text-slate-800">{dim.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">DE: ±{dim.std}</span>
                    <span className="font-extrabold text-sm text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {dim.mean} / 5.0
                    </span>
                  </div>
                </div>

                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${pct}%` }}
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* SUS Score Gauge (1 col) */}
        <div className="flex flex-col justify-between p-5 bg-gradient-to-br from-slate-50 to-emerald-50/30 rounded-xl border border-emerald-100 text-center">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
              <Award className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Índice Global SUS</h4>
            <div className="text-4xl font-black text-slate-900 tracking-tight my-2">
              {susMean}
              <span className="text-sm font-normal text-slate-400">/100</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border mx-auto mb-3 bg-emerald-100 text-emerald-800 border-emerald-200">
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              {isSusAcceptable ? 'Usabilidad Aceptable (>68)' : 'Requiere Refuerzo'}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-200/60 pt-3">
            El <strong className="text-slate-800">{data.sus?.acceptable_pct || 0}%</strong> de los estudiantes consideró la plataforma en rango de alta usabilidad (Grado A/B de Bangor et al.).
          </p>
        </div>
      </div>
    </div>
  );
}
