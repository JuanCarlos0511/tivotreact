import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, ShieldCheck, Activity, AlertCircle, ArrowRight } from 'lucide-react';

export function LoginPage() {
  const { login, isLoading, error } = useAuth();
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    try {
      await login(password);
    } catch {
      // Handled in context
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-emerald-900/40 mb-4 border border-emerald-500">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Tivot Analytics</h1>
          <p className="text-sm text-slate-400 mt-1">Dashboard de Investigación Científica (Dokploy)</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-100">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100 text-xs text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Módulo de Analítica y Exportación Zero-PII</span>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Contraseña de Investigador
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Introduce la clave de acceso"
                  required
                  autoFocus
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Clave de acceso configurada en el microservicio en Dokploy.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <span>{isLoading ? 'Verificando...' : 'Acceder al Panel'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="text-center mt-6 text-xs text-slate-500">
          Tivot Research Dataset • IEEE RITA / EDUCON 2026
        </div>
      </div>
    </div>
  );
}
