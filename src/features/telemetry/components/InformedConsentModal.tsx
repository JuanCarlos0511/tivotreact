import { useState } from 'react';
import './telemetry.css';

interface Props {
  isOpen: boolean;
  participantId: string;
  condition: string;
  onAccept: () => void;
  onPracticeOnly: () => void;
}

export function InformedConsentModal({ isOpen, participantId, condition, onAccept, onPracticeOnly }: Props) {
  const [hasAssent, setHasAssent] = useState(false);
  if (!isOpen) return null;

  return (
    <div className="level-complete-backdrop telemetry-consent-backdrop">
      <div className="telemetry-consent-modal" role="dialog" aria-modal="true" aria-labelledby="consent-title">
        <h2 id="consent-title">Bienvenido a Tivot</h2>
        <p>Este estudio analiza cómo la tutoría inteligente apoya el aprendizaje de programación.</p>
        <p>La participación es voluntaria y anónima. No solicitamos nombre, correo ni ningún dato personal. Solo registramos acciones de aprendizaje, errores, uso de pistas y respuestas de percepción.</p>

        <div className="telemetry-consent-form">
          <div className="telemetry-anonymous-code">
            <span>Código anónimo</span>
            <strong>{participantId}</strong>
            <small>Condición: {condition}</small>
          </div>
          <div className="telemetry-checkbox-group">
            <input id="assent-checkbox" type="checkbox" checked={hasAssent} onChange={(event) => setHasAssent(event.target.checked)} />
            <label htmlFor="assent-checkbox">Acepto participar voluntariamente y autorizo el envío de telemetría anónima.</label>
          </div>
        </div>

        <div className="telemetry-actions">
          <button className="complete-action primary" disabled={!hasAssent} onClick={onAccept}>Comenzar y participar</button>
          <button className="complete-action tertiary" onClick={onPracticeOnly}>Continuar sin enviar datos</button>
        </div>
      </div>
    </div>
  );
}
