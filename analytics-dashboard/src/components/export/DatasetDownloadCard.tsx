import React, { useState } from 'react';
import { Download, Loader2, FileSpreadsheet, FileText, Code2 } from 'lucide-react';
import { api } from '../../services/api';

interface Props {
  id: 'csv_flat' | 'csv_summary' | 'jsonl' | 'xlsx';
  title: string;
  filename: string;
  format: string;
  description: string;
  targetUse: string;
  badge: string;
}

export function DatasetDownloadCard({ id, title, filename, format, description, targetUse, badge }: Props) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      await api.downloadExport(id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error en la descarga';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    switch (format) {
      case 'XLSX':
        return <FileSpreadsheet className="w-6 h-6 text-emerald-600" />;
      case 'JSONL':
        return <Code2 className="w-6 h-6 text-amber-600" />;
      default:
        return <FileText className="w-6 h-6 text-sky-600" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
            {getIcon()}
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            {badge}
          </span>
        </div>

        <h3 className="font-bold text-slate-900 text-base mb-1">{title}</h3>
        <span className="font-mono text-xs text-slate-400 block mb-3">{filename}</span>

        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          {description}
        </p>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 mb-6">
          <strong className="text-slate-700 font-semibold block mb-0.5">Uso en el Paper:</strong>
          {targetUse}
        </div>
      </div>

      <button
        onClick={handleDownload}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs bg-slate-900 hover:bg-emerald-600 text-white transition-all shadow-sm disabled:opacity-50 disabled:pointer-events-none"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generando Archivo...</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>Descargar Dataset ({format})</span>
          </>
        )}
      </button>
    </div>
  );
}
