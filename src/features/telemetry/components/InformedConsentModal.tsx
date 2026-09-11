import { useState } from 'react';
import './telemetry.css';

interface Props {
  isOpen: boolean;
  onAccept: (participantId: string, groupId: string, hasAssent: boolean) => void;
}

export function InformedConsentModal({ isOpen, onAccept }: Props) {
  const [participantId, setParticipantId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [hasAssent, setHasAssent] = useState(false);

  if (!isOpen) return null;

  const handleGenerateCode = () => {
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    setParticipantId(`EXP-${randomChars}`);
  };

  const handleAccept = () => {
    if (participantId && hasAssent) {
      onAccept(participantId, groupId, true);
    }
  };

  const handlePracticeOnly = () => {
    onAccept('PRACTICE', '', false);
  };

  const isFormValid = participantId.length >= 3 && participantId.length <= 20 && hasAssent;

  return (
    <div className="level-complete-backdrop telemetry-consent-backdrop">
      <div className="telemetry-consent-modal">
        <h2>Bienvenido a Tivot</h2>
        <p>Estamos realizando un estudio para entender cómo la Inteligencia Artificial puede ayudar a los estudiantes a aprender programación de manera más efectiva.</p>
        <p>Tu participación es completamente voluntaria y anónima. No recolectaremos tu nombre ni datos personales, solo información sobre cómo usas la aplicación y resuelves los ejercicios.</p>
        
        <div className="telemetry-consent-form">
          <div className="telemetry-input-group">
            <label>Código de Participante</label>
            <div className="telemetry-input-with-button">
              <input 
                type="text" 
                className="telemetry-input"
                placeholder="Ej. EXP-A1B2" 
                value={participantId}
                onChange={e => setParticipantId(e.target.value.toUpperCase())}
                maxLength={20}
              />
              <button className="complete-action tertiary" onClick={handleGenerateCode}>
                Generar
              </button>
            </div>
          </div>

          <div className="telemetry-input-group">
            <label>Grupo / Clase (Opcional)</label>
            <input 
              type="text" 
              className="telemetry-input"
              placeholder="Ej. 3A" 
              value={groupId}
              onChange={e => setGroupId(e.target.value)}
              maxLength={20}
            />
          </div>

          <div className="telemetry-checkbox-group">
            <input 
              type="checkbox" 
              id="assent-checkbox"
              checked={hasAssent}
              onChange={e => setHasAssent(e.target.checked)}
            />
            <label htmlFor="assent-checkbox">
              Acepto participar voluntariamente en el estudio de investigación
            </label>
          </div>
        </div>

        <div className="telemetry-actions">
          <button 
            className="complete-action primary" 
            disabled={!isFormValid}
            onClick={handleAccept}
            style={{ opacity: isFormValid ? 1 : 0.5, cursor: isFormValid ? 'pointer' : 'not-allowed' }}
          >
            Comenzar Práctica
          </button>
          <button 
            className="complete-action tertiary"
            onClick={handlePracticeOnly}
          >
            Usar en modo solo práctica (sin enviar datos)
          </button>
        </div>
      </div>
    </div>
  );
}
