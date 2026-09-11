import React, { useState } from 'react';
import type { LearningCurveLevel } from '../../types/analytics';
import { Clock, RefreshCw, Trophy } from 'lucide-react';

interface Props {
  data: LearningCurveLevel[];
}

export function LearningCurveChart({ data }: Props) {
  const [metric, setMetric] = useState<'time' | 'attempts'>('time');

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        No hay datos suficientes de curvas de aprendizaje
      </div>
    );
  }

  const maxTime = Math.max(...data.map(d => d.mean_time_s || d.median_time_s || 10), 30);
  const maxAttempts = Math.max(...data.map(d => d.mean_attempts || d.median_attempts || 1), 5);

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-bold text-slate-900 text-base">Curva de Aprendizaje Progresivo</h3>
          <p className="text-xs text-slate-500 mt-0.5">Evolución de tiempo activo e intentos desde Nivel 1 hasta Nivel 4</p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs font-semibold">
          <button
            onClick={() => setMetric('time')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              metric === 'time' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            Tiempo Activo
          </button>
          <button
            onClick={() => setMetric('attempts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              metric === 'attempts' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
            Intentos
          </button>
        </div>
      </div>

      {/* Chart visualization */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {data.map((item) => {
          const val = metric === 'time' ? item.median_time_s : item.median_attempts;
          const max = metric === 'time' ? maxTime : maxAttempts;
          const heightPct = Math.min(Math.max((val / max) * 100, 12), 100);

          return (
            <div key={item.level_id} className="flex flex-col items-center">
              <div className="w-full h-44 bg-slate-50 rounded-xl p-2 flex flex-col justify-end items-center relative border border-slate-100 group">
                <span className="text-xs font-bold text-slate-800 mb-1.5 z-10">
                  {metric === 'time' ? `${val}s` : `${val} int`}
                </span>

                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full max-w-[48px] rounded-lg transition-all duration-500 ${
                    item.level_id === 4
                      ? 'bg-emerald-600 group-hover:bg-emerald-500 shadow-md shadow-emerald-200'
                      : 'bg-emerald-400 group-hover:bg-emerald-300'
                  }`}
                />
              </div>

              <span className="mt-2.5 text-xs font-bold text-slate-700">{item.level_name}</span>
              <span className="text-[11px] text-slate-400 font-medium">n={item.sample_size}</span>
            </div>
          );
        })}
      </div>

      {/* Statistical summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-slate-100 text-xs">
        {data.map((item) => (
          <div key={item.level_id} className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
            <div className="font-semibold text-slate-700">{item.level_name}</div>
            <div className="text-slate-500 text-[11px] mt-1 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-500" />
              Éxito 1er intento: <strong className="text-slate-800">{item.first_try_success_pct}%</strong>
            </div>
            <div className="text-slate-500 text-[11px] mt-0.5">
              Media: {item.mean_time_s}s ({item.mean_attempts} int)
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
