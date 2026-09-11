import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import type { 
  TelemetrySession, QueueStatus, SurveyAnswers, 
  TelemetryEventType, ErrorCategory, AiHintType 
} from '../../../types/telemetry';
import { eventQueue } from '../../../services/telemetry/eventQueue';
import { scaffoldingTracker } from '../../../services/telemetry/scaffoldingTracker';
import { telemetryClient } from '../../../services/telemetry/telemetryClient';
import { indexedDbStorage } from '../../../services/telemetry/indexedDbStorage';
import { InformedConsentModal } from '../components/InformedConsentModal';
import { PostPracticeSurveyModal } from '../components/PostPracticeSurveyModal';
import { ResearcherModal } from '../components/ResearcherModal';

export interface TelemetryContextValue {
  session: TelemetrySession | null;
  isPracticeMode: boolean;
  recordEvent: (
    eventType: TelemetryEventType, 
    levelId: number, 
    data?: {
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
      step_index?: number | undefined;
    } | undefined
  ) => void;
  showSurvey: () => void;
  evaluateHintEffectiveness: (levelId: number, wasSuccessful: boolean) => void;
  recordHintRequest: (levelId: number, hintType: AiHintType) => void;
  isResearcherPanelOpen: boolean;
  openResearcher: () => void;
}

export const TelemetryContext = createContext<TelemetryContextValue | null>(null);

export function TelemetryProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<TelemetrySession | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [showResearcher, setShowResearcher] = useState(false);
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({ pending: 0, synced: 0, failed: 0, lastSyncAt: null });

  // Init
  useEffect(() => {
    const saved = localStorage.getItem('tivot_telemetry_session');
    if (saved) {
      const s = JSON.parse(saved) as TelemetrySession;
      setSession(s);
      eventQueue.setEnabled(s.has_assent);
    } else {
      setShowConsent(true);
    }

    const updateStatus = async () => {
      if (showResearcher) {
        setQueueStatus(await eventQueue.getStatus());
      }
    };
    
    let interval: number;
    if (showResearcher) {
      updateStatus();
      interval = window.setInterval(updateStatus, 2000);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        setShowResearcher(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showResearcher]);

  const handleConsentAccept = async (participantId: string, groupId: string, hasAssent: boolean) => {
    const newSession: TelemetrySession = {
      id: crypto.randomUUID(),
      participant_id: participantId,
      group_id: groupId,
      has_assent: hasAssent,
      started_at: new Date().toISOString()
    };
    
    localStorage.setItem('tivot_telemetry_session', JSON.stringify(newSession));
    setSession(newSession);
    setShowConsent(false);
    eventQueue.setEnabled(hasAssent);

    if (hasAssent) {
      telemetryClient.createSession({
        participant_id: participantId,
        group_id: groupId,
        has_assent: hasAssent
      }).catch(() => {});
      
      recordEvent('SESSION_START', 0);
    }
  };

  const recordEvent = useCallback((
    eventType: TelemetryEventType, 
    levelId: number, 
    data?: Parameters<TelemetryContextValue['recordEvent']>[2]
  ) => {
    if (!session || !session.has_assent) return;
    
    eventQueue.enqueue({
      id: crypto.randomUUID(),
      session_id: session.id,
      participant_id: session.participant_id,
      level_id: levelId,
      event_type: eventType,
      created_at: new Date().toISOString(),
      ...data
    });
  }, [session]);

  const handleSurveySubmit = async (answers: SurveyAnswers) => {
    if (session && session.has_assent) {
      recordEvent('SURVEY_SUBMITTED', 0, { payload: { ...answers } });
      telemetryClient.submitSurvey({
        ...answers,
        session_id: session.id,
        participant_id: session.participant_id,
        raw_answers: answers
      }).catch(() => {});
    }
    setShowSurveyModal(false);
  };

  const evaluateHintEffectiveness = useCallback((levelId: number, wasSuccessful: boolean) => {
    const hint = scaffoldingTracker.evaluateNextAttempt(levelId, wasSuccessful);
    if (hint) {
      recordEvent('CODE_EXECUTION_ATTEMPT', levelId, {
        is_success: wasSuccessful,
        ai_hint_type: hint.hintType,
        ai_hint_effective: hint.effective
      });
    }
  }, [recordEvent]);

  const recordHintRequest = useCallback((levelId: number, hintType: AiHintType) => {
    scaffoldingTracker.recordHintRequest(levelId, hintType);
    recordEvent('AI_HINT_REQUESTED', levelId, { ai_hint_type: hintType });
  }, [recordEvent]);

  const value: TelemetryContextValue = {
    session,
    isPracticeMode: session ? !session.has_assent : true,
    recordEvent,
    showSurvey: () => setShowSurveyModal(true),
    evaluateHintEffectiveness,
    recordHintRequest,
    isResearcherPanelOpen: showResearcher,
    openResearcher: () => setShowResearcher(true)
  };

  return (
    <TelemetryContext.Provider value={value}>
      {children}
      <button
        type="button"
        className="telemetry-researcher-trigger"
        onClick={() => setShowResearcher(true)}
        title="Panel del investigador (Ctrl+Shift+E)"
        aria-label="Panel del investigador"
      >
        🔒
      </button>
      <InformedConsentModal 
        isOpen={showConsent} 
        onAccept={handleConsentAccept} 
      />
      <PostPracticeSurveyModal 
        isOpen={showSurveyModal} 
        onSubmit={handleSurveySubmit} 
        onSkip={() => setShowSurveyModal(false)} 
      />
      <ResearcherModal 
        isOpen={showResearcher}
        onClose={() => setShowResearcher(false)}
        queueStatus={queueStatus}
        sessionInfo={session}
        onForceSync={() => eventQueue.flush()}
        onDownloadCSV={() => eventQueue.downloadAsCSV()}
        onDownloadJSONL={() => eventQueue.downloadAsJSONL()}
        onClearLocalData={async () => {
          await indexedDbStorage.clearAll();
          localStorage.removeItem('tivot_telemetry_session');
          window.location.reload();
        }}
      />
    </TelemetryContext.Provider>
  );
}
