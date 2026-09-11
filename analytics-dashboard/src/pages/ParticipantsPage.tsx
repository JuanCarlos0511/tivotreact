import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { ParticipantsResponse } from '../types/analytics';
import { ShieldCheck, ChevronLeft, ChevronRight, Filter, RefreshCw, UserX } from 'lucide-react';

export function ParticipantsPage() {
  const [data, setData] = useState<ParticipantsResponse | null>(null);
  const [page, setPage] = useState<number>(1);
  const [selectedCondition, setSelectedCondition] = useState<string>('Todos');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const res = await api.getParticipants(page, 15, selectedCondition);
      setData(res);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, [page, selectedCondition]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Registro de Participantes</h2>
          <p className="text-xs text-slate-500 mt-0.5">Muestra anónima en tiempo de ejecución (Cumplimiento LFPDPPP Zero-PII)</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-600">Condición:</span>
            <select
              value={selectedCondition}
              onChange={(e) => {
                setSelectedCondition(e.target.value);
                setPage(1);
              }}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="Todos">Todas</option>
              <option value="standard">Estándar</option>
              <option value="ai_tutor">Tutor IA</option>
              <option value="control">Control</option>
            </select>
          </div>

          <button
            onClick={fetchParticipants}
            disabled={loading}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">ID Participante</th>
                <th className="px-6 py-4">Condición</th>
                <th className="px-6 py-4">Asentimiento</th>
                <th className="px-6 py-4">Nivel Máx.</th>
                <th className="px-6 py-4">Tiempo Activo</th>
                <th className="px-6 py-4">Pistas IA</th>
                <th className="px-6 py-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (!data || data.items.length === 0) ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Cargando participantes...
                  </td>
                </tr>
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <UserX className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No hay participantes registrados para este filtro
                  </td>
                </tr>
              ) : (
                data.items.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-800 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      {p.participant_id}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-semibold">{p.condition}</td>
                    <td className="px-6 py-4">
                      {p.has_assent ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Otorgado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Modo Práctica
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        Nivel {p.max_level}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">{p.total_active_time_s}s</td>
                    <td className="px-6 py-4 text-slate-600">{p.total_hints_used} pistas</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          p.status === 'Finalizado'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {data && data.total_pages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Total: <strong>{data.total}</strong> participantes (Página {data.page} de {data.total_pages})
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, data.total_pages))}
                disabled={page >= data.total_pages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
