/**
 * Hook de acceso rápido a la capa de telemetría de Tivot.
 * Re-exporta useTelemetry desde la característica de telemetría.
 */
export { useTelemetry } from '../features/telemetry/hooks/useTelemetry';
export type { ParticipantSession, TelemetryEventType, ErrorCategory, AiHintType, TelemetryEvent, TelemetrySession, SurveyAnswers, LikertScore, QueueStatus } from '../types/telemetry';
