import { useState } from 'react';
import type { QueueStatus, TelemetrySession } from '../../../types/telemetry';
import './telemetry.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  queueStatus: QueueStatus;
  onForceSync: () => void;
  onDownloadCSV: () => void;
  onDownloadJSONL: () => void;
  onClearLocalData: () => void;
  sessionInfo: TelemetrySession | null;
}

export function ResearcherModal({ 
  isOpen, onClose, queueStatus, onForceSync, onDownloadCSV, onDownloadJSONL, onClearLocalData, sessionInfo 
}: Props) {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isOpen) return null;

  const handleLogin = () => {
    if (pin === 'tivot2026') {
      setIsAuthenticated(true);
    } else {
      alert('PIN incorrecto');
    }
  };

  const handleClear = () => {
    if (window.confirm('¿Estás seguro de que quieres borrar todos los datos locales? Esto no se puede deshacer.')) {
      onClearLocalData();
    }
  };

  return (
    <div className="level-complete-backdrop">
      <div className="telemetry-consent-modal telemetry-researcher-modal">
        <button className="level-complete-close" onClick={onClose}>✕</button>
        
        <h2>Panel de Investigador</h2>
        
        {!isAuthenticated ? (
          <div className="telemetry-input-group" style={{ width: '100%', marginTop: '20px' }}>
            <label>PIN de Acceso</label>
            <div className="telemetry-input-with-button">
              <input 
                type="password" 
                className="telemetry-input"
                value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
              <button className="complete-action primary" onClick={handleLogin}>
                Entrar
              </button>
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', marginTop: '20px' }}>
            <div className="telemetry-stats-grid">
              <div className="telemetry-stat-card">
                <span className="telemetry-stat-value">{queueStatus.pending}</span>
                <span className="telemetry-stat-label">Pendientes</span>
              </div>
              <div className="telemetry-stat-card">
                <span className="telemetry-stat-value">{queueStatus.synced}</span>
                <span className="telemetry-stat-label">Sincronizados</span>
              </div>
              <div className="telemetry-stat-card">
                <span className="telemetry-stat-value">{queueStatus.failed}</span>
                <span className="telemetry-stat-label">Fallidos</span>
              </div>
            </div>

            <div style={{ marginBottom: '24px', fontSize: '13px', color: '#5e6a64' }}>
              <p>Última sincronización: {queueStatus.lastSyncAt ? new Date(queueStatus.lastSyncAt).toLocaleString() : 'Nunca'}</p>
              {sessionInfo ? (
                <p>
                  Sesión activa: {sessionInfo.participant_id} 
                  {sessionInfo.condition ? ` (Condición: ${sessionInfo.condition})` : ''}
                  - {sessionInfo.has_assent ? 'Con consentimiento' : 'Solo práctica'}
                </p>
              ) : (
                <p>No hay sesión activa.</p>
              )}
            </div>

            <div className="telemetry-actions">
              <button className="complete-action primary" onClick={onForceSync}>
                Forzar sincronización ahora
              </button>
              <button className="complete-action tertiary" onClick={onDownloadCSV}>
                Descargar eventos locales en CSV
              </button>
              <button className="complete-action tertiary" onClick={onDownloadJSONL}>
                Descargar eventos locales en JSONL
              </button>
              <button className="complete-action danger" onClick={handleClear}>
                Limpiar datos locales
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
