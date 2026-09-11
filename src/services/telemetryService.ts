/** API programática offline-first para instrumentar Tivot fuera de React. */
import type {
  AiHintType,
  ErrorCategory,
  QueueStatus,
  SurveyAnswers,
  TelemetryEvent,
  TelemetrySession,
} from '../types/telemetry';
import { eventQueue } from './telemetry/eventQueue';
import { exportService } from './telemetry/exportService';
import { indexedDbStorage } from './telemetry/indexedDbStorage';
import { scaffoldingTracker } from './telemetry/scaffoldingTracker';
import { telemetryClient } from './telemetry/telemetryClient';

const SESSION_KEY = 'tivot_telemetry_session';

function createEvent(
  session: TelemetrySession,
  levelId: number,
  eventType: TelemetryEvent['event_type'],
  data: Partial<TelemetryEvent> = {},
): TelemetryEvent {
  return {
    event_id: crypto.randomUUID(),
    session_id: session.session_id,
    participant_id: session.participant_id,
    level_id: levelId,
    event_type: eventType,
    timestamp: new Date().toISOString(),
    ...data,
  };
}

export class TelemetryService {
  static getCurrentSession(): TelemetrySession | null {
    try {
      const data = localStorage.getItem(SESSION_KEY);
      return data ? JSON.parse(data) as TelemetrySession : null;
    } catch {
      return null;
    }
  }

  static async recordEvent(event: TelemetryEvent): Promise<void> {
    await eventQueue.enqueue(event);
  }

  static async trackCodeExecution(levelId: number, attemptNumber: number, isSuccess: boolean, errorCategory?: ErrorCategory, errorSnippet?: string, codeSnapshot?: string): Promise<void> {
    const session = this.getCurrentSession();
    if (!session?.has_assent) return;
    const hint = scaffoldingTracker.evaluateNextAttempt(levelId, isSuccess);
    await eventQueue.enqueue(createEvent(session, levelId, errorCategory === 'SYNTAX_ERROR' ? 'syntax_error' : 'code_run', {
      attempt_number: attemptNumber,
      is_success: isSuccess,
      ...(errorCategory ? { error_category: errorCategory } : {}),
      ...(errorSnippet ? { error_message_snippet: errorSnippet.slice(0, 250) } : {}),
      ...(codeSnapshot ? { payload: { code: codeSnapshot } } : {}),
      ...(hint ? { ai_hint_type: hint.hintType, ai_hint_effective: hint.effective } : {}),
    }));
  }

  static async trackLevelStart(levelId: number): Promise<void> {
    const session = this.getCurrentSession();
    if (session?.has_assent) await eventQueue.enqueue(createEvent(session, levelId, 'level_started'));
  }

  static async trackLevelComplete(levelId: number, attemptNumber: number, activeTimeMs: number): Promise<void> {
    const session = this.getCurrentSession();
    if (session?.has_assent) await eventQueue.enqueue(createEvent(session, levelId, 'level_completed', { attempt_number: attemptNumber, active_time_ms: activeTimeMs }));
  }

  static async trackAiHint(levelId: number, hintType: AiHintType): Promise<void> {
    const session = this.getCurrentSession();
    if (!session?.has_assent) return;
    scaffoldingTracker.recordHintRequest(levelId, hintType);
    await eventQueue.enqueue(createEvent(session, levelId, 'ai_hint_requested', { ai_hint_type: hintType }));
  }

  static async trackIdle(levelId: number, idleTimeMs: number): Promise<void> {
    const session = this.getCurrentSession();
    if (session?.has_assent) await eventQueue.enqueue(createEvent(session, levelId, 'idle_detected', { idle_time_ms: idleTimeMs }));
  }

  static flush(): Promise<void> { return eventQueue.flush(); }
  static getQueueStatus(): Promise<QueueStatus> { return eventQueue.getStatus(); }
  static setEnabled(enabled: boolean): void { eventQueue.setEnabled(enabled); }
  static registerSession(session: TelemetrySession) { return telemetryClient.createSession(session); }

  static async submitSurvey(answers: SurveyAnswers): Promise<void> {
    const session = this.getCurrentSession();
    if (!session?.has_assent) return;
    await eventQueue.enqueue(createEvent(session, 4, 'survey_submitted', { payload: { answers } }));
  }

  static downloadLocalCSV(): Promise<void> { return eventQueue.downloadAsCSV(); }
  static downloadLocalJSONL(): Promise<void> { return eventQueue.downloadAsJSONL(); }
  static clearLocalData(): Promise<void> { return indexedDbStorage.clearAll(); }
}

export { eventQueue, telemetryClient, indexedDbStorage, exportService, scaffoldingTracker };
export default TelemetryService;
