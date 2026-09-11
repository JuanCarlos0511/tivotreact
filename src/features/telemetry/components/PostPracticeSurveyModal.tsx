import { useState } from 'react';
import type { LikertScore, SurveyAnswers } from '../../../types/telemetry';
import './telemetry.css';

interface Props {
  isOpen: boolean;
  onSubmit: (answers: SurveyAnswers) => void;
  onSkip: () => void;
}

const tamQuestions = [
  ['tam_perceived_usefulness', 'Tivot me ayudó a comprender mejor la lógica de programación.'],
  ['tam_perceived_ease_of_use', 'La interfaz y los controles fueron fáciles de usar.'],
  ['tam_ai_scaffolding', 'Las explicaciones del tutor de IA me ayudaron a avanzar.'],
  ['tam_ai_trust', 'Confío en las sugerencias del tutor de IA.'],
  ['tam_intention_to_use', 'Me gustaría usar Tivot en otras actividades de aprendizaje.'],
] as const;

const susQuestions = [
  'Me gustaría usar Tivot con frecuencia.',
  'Tivot me pareció innecesariamente complejo.',
  'Tivot me pareció fácil de usar.',
  'Necesitaría ayuda técnica para usar Tivot.',
  'Las funciones de Tivot están bien integradas.',
  'Encontré demasiadas inconsistencias en Tivot.',
  'La mayoría de las personas aprendería a usar Tivot rápidamente.',
  'Tivot me pareció incómodo o difícil de usar.',
  'Me sentí seguro al usar Tivot.',
  'Tuve que aprender muchas cosas antes de poder usar Tivot.',
] as const;

export function PostPracticeSurveyModal({ isOpen, onSubmit, onSkip }: Props) {
  const [answers, setAnswers] = useState<Record<string, LikertScore>>({});
  if (!isOpen) return null;

  const allKeys = [...tamQuestions.map(([key]) => key), ...susQuestions.map((_, index) => `sus_${index}`)];
  const isComplete = allKeys.every((key) => answers[key] !== undefined);
  const select = (key: string, value: LikertScore) => setAnswers((current) => ({ ...current, [key]: value }));

  const submit = () => {
    if (!isComplete) return;
    onSubmit({
      tam_perceived_usefulness: answers.tam_perceived_usefulness!,
      tam_perceived_ease_of_use: answers.tam_perceived_ease_of_use!,
      tam_ai_scaffolding: answers.tam_ai_scaffolding!,
      tam_ai_trust: answers.tam_ai_trust!,
      tam_intention_to_use: answers.tam_intention_to_use!,
      sus: susQuestions.map((_, index) => answers[`sus_${index}`]!) as SurveyAnswers['sus'],
    });
  };

  const renderQuestion = (key: string, text: string, number: number) => (
    <div key={key} className="telemetry-question">
      <div className="telemetry-question-text">{number}. {text}</div>
      <div className="telemetry-likert" role="group" aria-label={text}>
        {([1, 2, 3, 4, 5] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={`telemetry-likert-btn ${answers[key] === value ? 'selected' : ''}`}
            aria-pressed={answers[key] === value}
            onClick={() => select(key, value)}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="telemetry-likert-labels"><span>Totalmente en desacuerdo</span><span>Totalmente de acuerdo</span></div>
    </div>
  );

  return (
    <div className="level-complete-backdrop">
      <div className="telemetry-consent-modal telemetry-survey-modal" role="dialog" aria-modal="true" aria-labelledby="survey-title">
        <h2 id="survey-title">Encuesta final TAM/SUS</h2>
        <p>Responde del 1 al 5. Tus respuestas se vinculan únicamente con tu código anónimo.</p>
        <div className="telemetry-survey-questions">
          <h3>Percepción de utilidad y facilidad</h3>
          {tamQuestions.map(([key, text], index) => renderQuestion(key, text, index + 1))}
          <h3>Usabilidad del sistema (SUS)</h3>
          {susQuestions.map((text, index) => renderQuestion(`sus_${index}`, text, index + 6))}
        </div>
        <div className="telemetry-actions telemetry-survey-actions">
          <button className="complete-action tertiary" onClick={onSkip}>Omitir</button>
          <button className="complete-action primary" disabled={!isComplete} onClick={submit}>Enviar respuestas</button>
        </div>
      </div>
    </div>
  );
}
