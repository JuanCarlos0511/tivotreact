import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  AiHintType,
  QueueStatus,
  SurveyAnswers,
  TelemetryEvent,
  TelemetryEventType,
  TelemetrySession,
} from '../../../types/telemetry';
import { eventQueue } from '../../../services/telemetry/eventQueue';
import { scaffoldingTracker } from '../../../services/telemetry/scaffoldingTracker';
import { indexedDbStorage } from '../../../services/telemetry/indexedDbStorage';
import { InformedConsentModal } from '../components/InformedConsentModal';
import { PostPracticeSurveyModal } from '../components/PostPracticeSurveyModal';
import { ResearcherModal } from '../components/ResearcherModal';

const SESSION_KEY = 'tivot_telemetry_session';
const SURVEY_KEY_PREFIX = 'tivot_telemetry_survey_';
const RESEARCH_CONDITION = (import.meta.env.VITE_RESEARCH_CONDITION || 'standard').trim();

type EventData = Omit<
  TelemetryEvent,
  'event_id' | 'session_id' | 'participant_id' | 'level_id' | 'event_type' | 'timestamp'
>;

export interface TelemetryContextValue {
  session: TelemetrySession | null;
  isPracticeMode: boolean;
  recordEvent: (eventType: TelemetryEventType, levelId: number, data?: EventData) => void;
  showSurvey: () => void;
  recordHintRequest: (levelId: number, hintType: AiHintType) => void;
  consumeHintEffectiveness: (
    levelId: number,
    wasSuccessful: boolean,
  ) => Pick<EventData, 'ai_hint_type' | 'ai_hint_effective'>;
  isResearcherPanelOpen: boolean;
  openResearcher: () => void;
}

export const TelemetryContext = createContext<TelemetryContextValue | null>(null);

function createAnonymousParticipantId(): string {
  return `TIV-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;
}

function loadStoredSession(): TelemetrySession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<TelemetrySession> & {
      id?: string;
      started_at?: string;
      group_id?: string;
    };
    const sessionId = saved.session_id ?? saved.id;
    if (!sessionId || !saved.participant_id || typeof saved.has_assent !== 'boolean') return null;
    return {
      session_id: sessionId,
      participant_id: saved.participant_id,
      entry_timestamp: saved.entry_timestamp ?? saved.started_at ?? new Date().toISOString(),
      condition: saved.condition ?? saved.group_id ?? 'standard',
      has_assent: saved.has_assent,
    };
  } catch {
    return null;
  }
}

function makeEvent(
  activeSession: TelemetrySession,
  eventType: TelemetryEventType,
  levelId: number,
  data?: EventData,
): TelemetryEvent {
  return {
    event_id: crypto.randomUUID(),
    session_id: activeSession.session_id,
    participant_id: activeSession.participant_id,
    level_id: levelId,
    event_type: eventType,
    timestamp: new Date().toISOString(),
    ...data,
  };
}

function enqueueSessionStart(activeSession: TelemetrySession): void {
  void eventQueue.enqueue({
    ...makeEvent(activeSession, 'session_started', 0, {
      payload: {
        entry_timestamp: activeSession.entry_timestamp,
        condition: activeSession.condition,
      },
    }),
    // Un ID determinista hace esta reparación idempotente tras cada recarga.
    event_id: activeSession.session_id,
    timestamp: activeSession.entry_timestamp,
  });
}

export function TelemetryProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<TelemetrySession | null>(null);
  const [pendingParticipantId] = useState(createAnonymousParticipantId);
  const [showConsent, setShowConsent] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [showResearcher, setShowResearcher] = useState(false);
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({ pending: 0, synced: 0, failed: 0, lastSyncAt: null });

  useEffect(() => {
    const saved = loadStoredSession();
    if (saved) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(saved));
      setSession(saved);
      eventQueue.setEnabled(saved.has_assent);
      if (saved.has_assent) enqueueSessionStart(saved);
    } else {
      eventQueue.setEnabled(false);
      setShowConsent(true);
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'e') {
        setShowResearcher((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!showResearcher) return;
    const updateStatus = () => { void eventQueue.getStatus().then(setQueueStatus); };
    updateStatus();
    const interval = window.setInterval(updateStatus, 2_000);
    return () => window.clearInterval(interval);
  }, [showResearcher]);

  const recordEvent = useCallback((eventType: TelemetryEventType, levelId: number, data?: EventData) => {
    if (!session?.has_assent) return;
    void eventQueue.enqueue(makeEvent(session, eventType, levelId, data));
  }, [session]);

  const handleConsentAccept = useCallback((hasAssent: boolean) => {
    const now = new Date().toISOString();
    const newSession: TelemetrySession = {
      session_id: crypto.randomUUID(),
      participant_id: hasAssent ? pendingParticipantId : 'PRACTICE',
      entry_timestamp: now,
      condition: RESEARCH_CONDITION,
      has_assent: hasAssent,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    setSession(newSession);
    setShowConsent(false);
    eventQueue.setEnabled(hasAssent);

    if (hasAssent) {
      enqueueSessionStart(newSession);
    }
  }, [pendingParticipantId]);

  const handleSurveySubmit = useCallback((answers: SurveyAnswers) => {
    if (session?.has_assent) {
      localStorage.setItem(`${SURVEY_KEY_PREFIX}${session.session_id}`, 'submitted');
      void eventQueue.enqueue(makeEvent(session, 'survey_submitted', 4, { payload: { answers } }));
    }
    setShowSurveyModal(false);
  }, [session]);

  const showSurvey = useCallback(() => {
    if (!session?.has_assent) return;
    if (!localStorage.getItem(`${SURVEY_KEY_PREFIX}${session.session_id}`)) setShowSurveyModal(true);
  }, [session]);

  const skipSurvey = useCallback(() => {
    if (session) localStorage.setItem(`${SURVEY_KEY_PREFIX}${session.session_id}`, 'skipped');
    setShowSurveyModal(false);
  }, [session]);

  const recordHintRequest = useCallback((levelId: number, hintType: AiHintType) => {
    scaffoldingTracker.recordHintRequest(levelId, hintType);
    recordEvent('ai_hint_requested', levelId, { ai_hint_type: hintType });
  }, [recordEvent]);

  const consumeHintEffectiveness = useCallback((levelId: number, wasSuccessful: boolean) => {
    const hint = scaffoldingTracker.evaluateNextAttempt(levelId, wasSuccessful);
    return hint ? { ai_hint_type: hint.hintType, ai_hint_effective: hint.effective } : {};
  }, []);

  const value = useMemo<TelemetryContextValue>(() => ({
    session,
    isPracticeMode: session ? !session.has_assent : true,
    recordEvent,
    showSurvey,
    recordHintRequest,
    consumeHintEffectiveness,
    isResearcherPanelOpen: showResearcher,
    openResearcher: () => setShowResearcher(true),
  }), [consumeHintEffectiveness, recordEvent, recordHintRequest, session, showResearcher, showSurvey]);

  return (
    <TelemetryContext.Provider value={value}>
      {children}
      <button type="button" className="telemetry-researcher-trigger" onClick={() => setShowResearcher(true)} title="Panel del investigador (Ctrl+Shift+E)" aria-label="Panel del investigador">🔒</button>
      <InformedConsentModal
        isOpen={showConsent}
        participantId={pendingParticipantId}
        condition={RESEARCH_CONDITION}
        onAccept={() => handleConsentAccept(true)}
        onPracticeOnly={() => handleConsentAccept(false)}
      />
      <PostPracticeSurveyModal isOpen={showSurveyModal} onSubmit={handleSurveySubmit} onSkip={skipSurvey} />
      <ResearcherModal
        isOpen={showResearcher}
        onClose={() => setShowResearcher(false)}
        queueStatus={queueStatus}
        sessionInfo={session}
        onForceSync={() => { void eventQueue.flush(); }}
        onDownloadCSV={() => { void eventQueue.downloadAsCSV(); }}
        onDownloadJSONL={() => { void eventQueue.downloadAsJSONL(); }}
        onClearLocalData={async () => {
          await indexedDbStorage.clearAll();
          localStorage.removeItem(SESSION_KEY);
          window.location.reload();
        }}
      />
    </TelemetryContext.Provider>
  );
}
