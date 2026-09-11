import { useState } from 'react';
import type { SurveyAnswers } from '../../../types/telemetry';
import './telemetry.css';

interface Props {
  isOpen: boolean;
  onSubmit: (answers: SurveyAnswers) => void;
  onSkip: () => void;
}

export function PostPracticeSurveyModal({ isOpen, onSubmit, onSkip }: Props) {
  const [answers, setAnswers] = useState<Partial<SurveyAnswers>>({});

  if (!isOpen) return null;

  const questions = [
    { key: 'tam_perceived_usefulness', text: '1. Tivot me ayudó a entender mejor cómo funciona la lógica de programación.' },
    { key: 'tam_perceived_ease_of_use', text: '2. La interfaz y los controles de código fueron fáciles de usar.' },
    { key: 'tam_ai_scaffolding', text: '3. Las explicaciones del tutor de IA fueron claras y acertadas.' },
    { key: 'tam_ai_trust', text: '4. Confío en las sugerencias que me dio la Inteligencia Artificial.' },
    { key: 'tam_intention_to_use', text: '5. Me gustaría volver a usar este tipo de software en otras materias.' }
  ] as const;

  const handleSelect = (key: keyof SurveyAnswers, value: number) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const isComplete = questions.every(q => answers[q.key as keyof SurveyAnswers] !== undefined);

  const handleSubmit = () => {
    if (isComplete) {
      onSubmit(answers as SurveyAnswers);
    }
  };

  return (
    <div className="level-complete-backdrop">
      <div className="telemetry-consent-modal telemetry-survey-modal">
        <h2>¡Excelente trabajo!</h2>
        <p>Para ayudarnos a mejorar, por favor responde estas breves preguntas sobre tu experiencia con Tivot.</p>
        
        <div className="telemetry-survey-questions">
          {questions.map(q => (
            <div key={q.key} className="telemetry-question">
              <div className="telemetry-question-text">{q.text}</div>
              <div className="telemetry-likert">
                {[1, 2, 3, 4, 5].map(val => (
                  <button
                    key={val}
                    className={`telemetry-likert-btn ${answers[q.key as keyof SurveyAnswers] === val ? 'selected' : ''}`}
                    onClick={() => handleSelect(q.key as keyof SurveyAnswers, val)}
                  >
                    {val}
                  </button>
                ))}
              </div>
              <div className="telemetry-likert-labels">
                <span>Totalmente en desacuerdo</span>
                <span>Totalmente de acuerdo</span>
              </div>
            </div>
          ))}
        </div>

        <div className="telemetry-actions" style={{ flexDirection: 'row', width: '100%' }}>
          <button 
            className="complete-action tertiary" 
            style={{ flex: 1 }}
            onClick={onSkip}
          >
            Omitir encuesta
          </button>
          <button 
            className="complete-action primary"
            style={{ flex: 1, opacity: isComplete ? 1 : 0.5, cursor: isComplete ? 'pointer' : 'not-allowed' }}
            disabled={!isComplete}
            onClick={handleSubmit}
          >
            Enviar respuestas
          </button>
        </div>
      </div>
    </div>
  );
}
