import React from 'react';
import { DatasetDownloadCard } from '../components/export/DatasetDownloadCard';
import { Database, FileCheck } from 'lucide-react';

export function ExportCenterPage() {
  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Centro de Exportación Científica</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Open Science Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
            Descarga directa de los datasets brutos y agregados listos para análisis estadístico (SPSS, R, Python/Pandas), minería de procesos (Disco/ProM) y presentación ante revisores de IEEE RITA / EDUCON.
          </p>
        </div>

        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 shrink-0">
          <Database className="w-5 h-5 text-emerald-600" />
          <div>
            <div className="font-bold text-slate-800">Directo del VPS Dokploy</div>
            <div className="text-[11px] text-slate-400">Sin intermediarios ni truncamiento</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DatasetDownloadCard
          id="csv_flat"
          title="Dataset Transaccional de Eventos"
          filename="telemetry_events.csv"
          format="CSV"
          badge="Nivel Evento"
          description="Una fila por cada acción atómica registrada (inicios de nivel, ejecuciones de código, errores tipificados, solicitud de pistas de IA, períodos de inactividad)."
          targetUse="Análisis de secuencias, detección de atascos (wheeling/gaming the system) y modelado de trayectorias en ProM o Disco."
        />

        <DatasetDownloadCard
          id="csv_summary"
          title="Dataset Agregado por Estudiante"
          filename="student_metrics_summary.csv"
          format="CSV"
          badge="Nivel Estudiante"
          description="Una fila por participante con variables consolidadas: intentos y tiempos activos desglosados N1-N4, efectividad de pistas IA, y puntajes TAM/SUS."
          targetUse="Pruebas t-Student (N1 vs N4), ANOVA de medidas repetidas, correlaciones de Pearson/Spearman y regresiones lineales en SPSS, R o SciPy."
        />

        <DatasetDownloadCard
          id="jsonl"
          title="Registro Íntegro Semi-Estructurado"
          filename="telemetry_data.jsonl"
          format="JSONL"
          badge="Raw Log"
          description="Objetos JSON independientes por línea preservando el código Karel escrito por el alumno, los errores de consola y los intercambios conversacionales completos con el tutor IA."
          targetUse="Minería de texto, análisis de prompts/respuestas del LLM (NLP) y análisis cualitativo de intervenciones pedagógicas."
        />

        <DatasetDownloadCard
          id="xlsx"
          title="Libro Excel de Investigación Científica"
          filename="tivot_research_dataset.xlsx"
          format="XLSX"
          badge="Multi-Hoja"
          description="Libro de cálculo organizado en 4 pestañas formateadas: 1_Participantes, 2_Rendimiento_Niveles, 3_Uso_IA_Pistas y 4_Encuesta_TAM_SUS."
          targetUse="Auditoría de datos, inspección visual rápida con coautores o tutores y carpetas de evidencia ante Comités de Ética e Investigación (IRB)."
        />
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-500">
        <FileCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
        <p className="leading-relaxed">
          <strong>Garantía Zero-PII:</strong> Ningún archivo descargado contiene identificadores personales, nombres, correos ni direcciones IP de los alumnos participantes. Los datos son enteramente reproducibles y anónimos conforme a los estándares éticos de publicación científica internacional.
        </p>
      </div>
    </div>
  );
}
