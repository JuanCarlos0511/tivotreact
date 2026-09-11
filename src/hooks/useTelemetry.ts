/**
 * Hook de acceso rápido a la capa de telemetría de Tivot.
 * Re-exporta useTelemetry desde la característica de telemetría.
 */
export { useTelemetry } from '../features/telemetry/hooks/useTelemetry';
export type { TelemetryEventType, ErrorCategory, AiHintType, TelemetryEvent, TelemetrySession, SurveyAnswers, QueueStatus } from '../types/telemetry';
