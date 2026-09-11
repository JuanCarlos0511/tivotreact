import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { OverviewMetrics, LearningCurveLevel, ScaffoldingItem, ErrorTaxonomy, SurveySummary } from '../types/analytics';
import { MetricCard } from '../components/metrics/MetricCard';
import { LearningCurveChart } from '../components/metrics/LearningCurveChart';
import { ScaffoldingChart } from '../components/metrics/ScaffoldingChart';
import { ErrorDistributionChart } from '../components/metrics/ErrorDistributionChart';
import { SurveyLikertChart } from '../components/metrics/SurveyLikertChart';
import { Users, TrendingDown, Timer, Award, Filter, RefreshCw, AlertCircle } from 'lucide-react';

export function DashboardPage() {
  const [selectedGroup, setSelectedGroup] = useState<string>('Todos');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [learningCurve, setLearningCurve] = useState<LearningCurveLevel[]>([]);
  const [scaffolding, setScaffolding] = useState<ScaffoldingItem[]>([]);
  const [errorTaxonomy, setErrorTaxonomy] = useState<ErrorTaxonomy | null>(null);
  const [surveySummary, setSurveySummary] = useState<SurveySummary | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, lc, sc, et, ss] = await Promise.all([
        api.getOverview(selectedGroup),
        api.getLearningCurve(selectedGroup),
        api.getScaffoldingEfficacy(selectedGroup),
        api.getErrorTaxonomy(selectedGroup),
        api.getSurveySummary(selectedGroup),
      ]);
      setOverview(ov);
      setLearningCurve(lc);
      setScaffolding(sc);
      setErrorTaxonomy(et);
      setSurveySummary(ss);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con la API de telemetría';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedGroup]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Dashboard General de Aprendizaje</h2>
          <p className="text-xs text-slate-500 mt-0.5">Indicadores empíricos de desempeño, andamiaje y usabilidad</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-600">Grupo:</span>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="Todos">Todos los Grupos</option>
              <option value="GRUPO-3A">Grupo 3A</option>
              <option value="GRUPO-3B">Grupo 3B</option>
              <option value="GRUPO-3C">Grupo 3C</option>
              <option value="Sin Grupo">Sin Grupo Asignado</option>
            </select>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Actualizar métricas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-800">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <strong className="block font-bold">Error de sincronización con el backend:</strong>
            {error} (Verifica que el servicio en Dokploy esté encendido y que el token sea válido).
          </div>
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Muestra Total (N)"
          value={overview ? overview.total_participants : '—'}
          subtitle={`${overview ? overview.active_sessions : 0} sesiones activas en aula`}
          icon={Users}
          badge={{ text: 'Zero-PII', type: 'success' }}
        />

        <MetricCard
          title="Tasa de Finalización"
          value={overview ? `${overview.completion_rate}%` : '—'}
          subtitle={`${overview ? overview.completed_participants : 0} completaron Nivel 4`}
          icon={TrendingDown}
          badge={{
            text: overview && overview.completion_rate >= 70 ? 'Óptima' : 'En progreso',
            type: overview && overview.completion_rate >= 70 ? 'success' : 'warning',
          }}
        />

        <MetricCard
          title="Reducción Tiempo N1 vs N4"
          value={overview ? `${overview.time_reduction_pct}%` : '—'}
          subtitle={`N1: ${overview ? overview.avg_time_level_1_s : 0}s → N4: ${overview ? overview.avg_time_level_4_s : 0}s`}
          icon={Timer}
          badge={{ text: 'Ganancia', type: 'info' }}
        />

        <MetricCard
          title="Índice Usabilidad SUS"
          value={overview ? `${overview.avg_sus_score}` : '—'}
          subtitle="Corte de usabilidad aceptable > 68"
          icon={Award}
          badge={{
            text: overview && overview.avg_sus_score >= 68 ? 'Aceptable' : 'Reforzar',
            type: overview && overview.avg_sus_score >= 68 ? 'success' : 'neutral',
          }}
        />
      </div>

      {/* Main Analytical Visualizations */}
      <div className="grid grid-cols-1 gap-6">
        <LearningCurveChart data={learningCurve} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScaffoldingChart data={scaffolding} />
        {errorTaxonomy && <ErrorDistributionChart data={errorTaxonomy} />}
      </div>

      <div>
        {surveySummary && <SurveyLikertChart data={surveySummary} />}
      </div>
    </div>
  );
}
