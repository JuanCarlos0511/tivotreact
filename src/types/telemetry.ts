// Event types enum
export type TelemetryEventType =
  | 'SESSION_START'
  | 'LEVEL_START'
  | 'LEVEL_COMPLETE'
  | 'CODE_EXECUTION_ATTEMPT'
  | 'ERROR_ENCOUNTERED'
  | 'AI_HINT_REQUESTED'
  | 'IDLE_PERIOD_DETECTED'
  | 'SURVEY_SUBMITTED';

// Error taxonomy
export type ErrorCategory =
  | 'SYNTAX_ERROR'
  | 'LOGIC_BUSINESS_RULE'
  | 'INCOMPLETE_ALGORITHM'
  | 'RUNTIME_EXCEPTION';

// AI hint types
export type AiHintType = 'Conceptual' | 'Corrección de Sintaxis' | 'Solución Directa';

// Full TelemetryEvent interface matching backend schema
export interface TelemetryEvent {
  id: string; // UUID generated client-side
  session_id: string;
  participant_id: string;
  level_id: number;
  step_index?: number | undefined;
  event_type: TelemetryEventType;
  is_success?: boolean | undefined;
  attempt_number?: number | undefined;
  active_time_ms?: number | undefined;
  idle_time_ms?: number | undefined;
  error_category?: ErrorCategory | undefined;
  error_message_snippet?: string | undefined;
  ai_hint_type?: AiHintType | undefined;
  ai_hint_effective?: boolean | undefined;
  autonomy_score?: number | undefined;
  payload?: Record<string, unknown> | undefined;
  created_at: string; // ISO 8601
}

// Session info stored locally
export interface TelemetrySession {
  id: string;
  participant_id: string;
  group_id?: string | undefined;
  has_assent: boolean;
  started_at: string;
}

// Survey types
export interface SurveyAnswers {
  tam_perceived_usefulness: number; // 1-5
  tam_perceived_ease_of_use: number; // 1-5
  tam_ai_scaffolding: number; // 1-5
  tam_ai_trust: number; // 1-5
  tam_intention_to_use: number; // 1-5
}

// Queue status for researcher panel
export interface QueueStatus {
  pending: number;
  synced: number;
  failed: number;
  lastSyncAt: string | null;
}
