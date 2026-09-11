/** Valores admitidos por las escalas TAM y SUS. */
export type LikertScore = 1 | 2 | 3 | 4 | 5;

/** Contrato anónimo de una participación. No contiene PII. */
export interface ParticipantSession {
  participant_id: string;
  entry_timestamp: string;
  condition: string;
}

/** Eventos canónicos enviados a la API de telemetría. */
export type TelemetryEventType =
  | 'session_started'
  | 'level_started'
  | 'code_run'
  | 'syntax_error'
  | 'ai_hint_requested'
  | 'level_completed'
  | 'idle_detected'
  | 'survey_submitted';

export type ErrorCategory =
  | 'SYNTAX_ERROR'
  | 'LOGIC_POS_RULE'
  | 'LOGIC_BUSINESS_RULE'
  | 'INCOMPLETE_CODE'
  | 'INCOMPLETE_ALGORITHM'
  | 'RUNTIME'
  | 'RUNTIME_EXCEPTION';

export type AiHintType = 'Conceptual' | 'Corrección de Sintaxis' | 'Solución Directa';

export interface TelemetryEvent {
  event_id: string;
  session_id: string;
  participant_id: string;
  level_id: number;
  event_type: TelemetryEventType;
  payload?: Record<string, unknown>;
  timestamp: string;
  step_index?: number;
  is_success?: boolean;
  attempt_number?: number;
  active_time_ms?: number;
  idle_time_ms?: number;
  error_category?: ErrorCategory;
  error_message_snippet?: string;
  ai_hint_type?: AiHintType;
  ai_hint_effective?: boolean;
  autonomy_score?: number;
}

/** Sesión operativa persistida por el cliente. */
export interface TelemetrySession extends ParticipantSession {
  session_id: string;
  has_assent: boolean;
}

export interface SurveyAnswers {
  tam_perceived_usefulness: LikertScore;
  tam_perceived_ease_of_use: LikertScore;
  tam_ai_scaffolding: LikertScore;
  tam_ai_trust: LikertScore;
  tam_intention_to_use: LikertScore;
  /** Respuestas SUS 1..10, en el orden estándar. */
  sus: [
    LikertScore, LikertScore, LikertScore, LikertScore, LikertScore,
    LikertScore, LikertScore, LikertScore, LikertScore, LikertScore,
  ];
}

export interface QueueStatus {
  pending: number;
  synced: number;
  failed: number;
  lastSyncAt: string | null;
}
