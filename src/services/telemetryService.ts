/**
 * Servicio unificado de telemetría para Tivot (Learning Analytics).
 * Gestiona la cola offline-first, persistencia en IndexedDB/localStorage y comunicación con el backend Dokploy.
 */

import { eventQueue } from './telemetry/eventQueue';
import { telemetryClient } from './telemetry/telemetryClient';
import { indexedDbStorage } from './telemetry/indexedDbStorage';
import { exportService } from './telemetry/exportService';
import { scaffoldingTracker } from './telemetry/scaffoldingTracker';
import type { TelemetryEvent, TelemetrySession, SurveyAnswers, QueueStatus } from '../types/telemetry';

export class TelemetryService {
  /**
   * Encola un evento de telemetría en el almacenamiento local.
   */
  static async recordEvent(event: TelemetryEvent): Promise<void> {
    await eventQueue.enqueue(event);
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
