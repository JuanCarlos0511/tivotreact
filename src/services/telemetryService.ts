/**
 * Servicio unificado de telemetría para Tivot (Learning Analytics).
 * Gestiona la cola offline-first, persistencia en IndexedDB/localStorage y comunicación con el backend Dokploy.
 */

import { eventQueue } from './telemetry/eventQueue';
import { telemetryClient } from './telemetry/telemetryClient';
import { indexedDbStorage } from './telemetry/indexedDbStorage';
import { exportService } from './telemetry/exportService';
import { scaffoldingTracker } from './telemetry/scaffoldingTracker';
import type { TelemetryEvent, TelemetrySession, SurveyAnswers, QueueStatus, ErrorCategory, AiHintType } from '../types/telemetry';

export class TelemetryService {
  /**
   * Obtiene la sesión actual almacenada localmente.
   */
  static getCurrentSession(): TelemetrySession | null {
    try {
      const data = localStorage.getItem('tivot_telemetry_session');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Encola un evento de telemetría en el almacenamiento local.
   */
  static async recordEvent(event: TelemetryEvent): Promise<void> {
    await eventQueue.enqueue(event);
  }

  /**
   * Captura de ejecución de código y errores (Sintaxis, Reglas POS, Incompleto, Runtime).
   */
  static async trackCodeExecution(
    levelId: number,
    attemptNumber: number,
    isSuccess: boolean,
    errorCategory?: ErrorCategory,
    errorSnippet?: string
  ): Promise<void> {
    const session = this.getCurrentSession();
    if (!session || !session.has_assent) return;

    await this.recordEvent({
      id: crypto.randomUUID(),
      session_id: session.id,
      participant_id: session.participant_id,
      level_id: levelId,
      event_type: 'CODE_EXECUTION_ATTEMPT',
      attempt_number: attemptNumber,
      is_success: isSuccess,
      ...(errorCategory ? { error_category: errorCategory } : {}),
      ...(errorSnippet ? { error_message_snippet: errorSnippet } : {}),
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Captura de inicio de nivel.
   */
  static async trackLevelStart(levelId: number): Promise<void> {
    const session = this.getCurrentSession();
    if (!session || !session.has_assent) return;

    await this.recordEvent({
      id: crypto.randomUUID(),
      session_id: session.id,
      participant_id: session.participant_id,
      level_id: levelId,
      event_type: 'LEVEL_START',
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Captura de nivel completado con tiempo activo acumulado.
   */
  static async trackLevelComplete(levelId: number, attemptNumber: number, activeTimeMs: number): Promise<void> {
    const session = this.getCurrentSession();
    if (!session || !session.has_assent) return;

    await this.recordEvent({
      id: crypto.randomUUID(),
      session_id: session.id,
      participant_id: session.participant_id,
      level_id: levelId,
      event_type: 'LEVEL_COMPLETE',
      attempt_number: attemptNumber,
      active_time_ms: activeTimeMs,
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Captura de solicitud de pista al tutor IA.
   */
  static async trackAiHint(levelId: number, hintType: AiHintType): Promise<void> {
    const session = this.getCurrentSession();
    if (!session || !session.has_assent) return;

    scaffoldingTracker.recordHintRequest(levelId, hintType);
    await this.recordEvent({
      id: crypto.randomUUID(),
      session_id: session.id,
      participant_id: session.participant_id,
      level_id: levelId,
      event_type: 'AI_HINT_REQUESTED',
      ai_hint_type: hintType,
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Captura de inactividad (>45s).
   */
  static async trackIdle(levelId: number, idleTimeMs: number): Promise<void> {
    const session = this.getCurrentSession();
    if (!session || !session.has_assent) return;

    await this.recordEvent({
      id: crypto.randomUUID(),
      session_id: session.id,
      participant_id: session.participant_id,
      level_id: levelId,
      event_type: 'IDLE_PERIOD_DETECTED',
      idle_time_ms: idleTimeMs,
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Fuerza el envío de todos los eventos acumulados hacia el backend.
   */
  static async flush(): Promise<void> {
    await eventQueue.flush();
  }

  /**
   * Obtiene el estado actual de sincronización para el panel de investigador.
   */
  static async getQueueStatus(): Promise<QueueStatus> {
    return eventQueue.getStatus();
  }

  /**
   * Activa o desactiva la captura (para modo solo práctica / sin asentimiento).
   */
  static setEnabled(enabled: boolean): void {
    eventQueue.setEnabled(enabled);
  }

  /**
   * Registra una nueva sesión en el backend si el participante otorgó su asentimiento.
   */
  static async registerSession(session: Omit<TelemetrySession, 'id' | 'started_at'>) {
    return telemetryClient.createSession(session);
  }

  /**
   * Envía la encuesta final TAM/SUS computada.
   */
  static async submitSurvey(data: SurveyAnswers & { session_id: string; participant_id?: string; raw_answers?: Record<string, unknown> | SurveyAnswers }) {
    return telemetryClient.submitSurvey(data);
  }

  /**
   * Descarga de emergencia local en formato CSV.
   */
  static async exportLocalCSV(): Promise<void> {
    await eventQueue.downloadAsCSV();
  }

  /**
   * Descarga de emergencia local en formato JSONL.
   */
  static async exportLocalJSONL(): Promise<void> {
    await eventQueue.downloadAsJSONL();
  }

  /**
   * Limpia toda la base de datos local de eventos.
   */
  static async clearLocalData(): Promise<void> {
    await indexedDbStorage.clearAll();
  }
}

export {
  eventQueue,
  telemetryClient,
  indexedDbStorage,
  exportService,
  scaffoldingTracker,
};

export default TelemetryService;
